import { isUndefined, merge, pick } from 'lodash';
import moment from 'moment';
import qs from 'qs';
import {
  sequelize,
  Identification,
  ClientSpouse,
  ClientBank,
  Education,
  State,
  Lga,
  Applicants,
  Occupation,
  LoanApplication,
  BusinessEmployment,
  BusinessEmploymentType,
} from '../database/models';

import RespUtil from '../utils/RespUtil';
import Paginate from '../utils/Pagination';
import CustomError from '../utils/CustomError';
import ValidatorHelper from '../utils/ValidatorHelper';
import ErrorHandler from '../errors/error.handler';
import Utility from '../utils/Utility';
/*
const FORBIDDEN_NAME = [
  'limited',
  'company',
  'international',
  'resources',
  'nigeria',
  'integrated',
  'ltd',
  'global',
  'energy',
  'venture',
  'investment',
  'systems',
  'services',
  'system',
  'service',
  'digital',
];
*/

// fields
const APPLICANT = [
  'name',
  'title',
  'date_of_birth',
  'gender',
  'marital_status',
  'phone_number',
  'home_address',
  'landmark',
  'religion',
  'place_of_worship',
  'mother_maiden_name',
  'email_address',
  'place_of_issuance',
  'id_card_number',
  'date_issued',
  'expiry_date_issued',
  'identity_type_id',
  'bvn',
  'spouse_name',
  'spouse_phone_number',
  'spouse_occupation_id',
  'education_id',
  'occupation_id',
  'lga_id',
  'place_of_birth_id',
  // 'bank_details',
];

const { validateApplicant } = ValidatorHelper;
const { activityLog, newPagHandler } = Utility;
const util = new RespUtil();

/**
 * APPLICANT CONTROLLER
 */
export default class ApplicantController {
  static async getApplicants(req, res) {
    const { page, limit, ...rest } = qs.parse(req.query);

    const currentPage = parseInt(page, 30) || 1;
    const defaultLimit = parseInt(limit, 20) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      // search by name, email, phone_number & bvn
      const whereQry = {};
      const qry = {
        name: !isUndefined(rest.name) ? rest.name.trim().toUpperCase() : undefined,
        phone_number: !isUndefined(rest.phone) ? rest.phone.replace(/[^0-9]/g, '') : undefined,
        email_address: !isUndefined(rest.email) ? rest.email.trim().toLowerCase() : undefined,
      };

      Object.keys(qry).forEach((key) => {
        if (qry[key]) merge(whereQry, { [key]: { $like: `%${qry[key]}%` } });
      });

      /* You can't search by BVN
      if (!isUndefined(bvn) && bvn !== '') {
        merge(whereQry, { bvn: { $like: `%${bvn}%` } });
      } */

      const options = {
        where: whereQry,
        ...pagOptns,
      };

      const applicants = await Applicants.findAndCountAll(options);

      util.setPagination(new Paginate(applicants, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', applicants.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Get Applicant loans histories
   */
  static async getLoanHistories(req, res) {
    const { applicant_id } = req.params;
    const { page, limit } = qs.parse(req.query);

    const currentPage = parseInt(page, 30) || 1;
    const defaultLimit = parseInt(limit, 20) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      const options = {
        where: { applicant_id },
        attributes: [
          'id',
          'refrence_no',
          'amount',
          'purpose',
          [
            sequelize.literal(`(
            SELECT
            CASE 
              WHEN slug IN ('CLOSED', 'REJECTED') THEN 'Completed'
              ELSE 'In Progress'
            END AS status
            FROM loan_states
            WHERE current_state_id = loan_states.id
          )`),
            'status',
          ],
          [
            sequelize.literal(`(
              SELECT name FROM loan_type WHERE loan_type_id = loan_type.id
            )`),
            'type',
          ],
          [
            sequelize.literal(`(
              SELECT slug FROM loan_sources WHERE loan_source_id = loan_sources.id
            )`),
            'source',
          ],
          'created_at',
        ],
        ...pagOptns,
        order: [['created_at', 'DESC']],
      };

      const loans = await LoanApplication.findAndCountAll(options);

      util.setPagination(new Paginate(loans, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', loans.rows);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async createNewApplicant(req, res) {
    const { user } = req;
    const t = await sequelize.transaction();

    try {
      const payload = pick(req.body, APPLICANT);
      await validateApplicant().validateAsync(payload);

      const {
        spouse_name: name,
        spouse_phone_number: phone_number,
        spouse_occupation_id: occupation_id,

        identity_type_id,
        id_card_number,
        date_issued,
        expiry_date_issued,

        name: applicant_name,
        ...data
      } = payload;

      if (moment(expiry_date_issued).format() < moment().format()) {
        throw new CustomError('Invalid identification document, expired date must be future date');
      }

      const identity = await Identification.create(
        { identity_type_id, id_card_number, date_issued, expiry_date_issued },
        { transaction: t }
      );

      const spouse = await ClientSpouse.create(
        { name, phone_number, occupation_id },
        { transaction: t }
      );

      const applicant = await Applicants.create(
        {
          ...data,
          name: applicant_name.trim().toUpperCase(),
          spouse_id: spouse.id,
          identification_id: identity.id,
        },
        { transaction: t }
      );
      /*
      const banks = [];
      bank_details.map((bank) =>
        banks.push({
          applicant_id: applicant.id,
          ...bank,
        })
      );
      await ClientBank.bulkCreate(banks, { transaction: t });
      */
      await t.commit();

      // activities logs
      activityLog('ip', user, 'applicant_create', {
        applicant_id: applicant.id,
      });

      util.setSuccess(200, 'successful', {
        ...(['test'].includes(process.env.NODE_ENV) && { id: applicant.id }),
      });

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getApplicantById(req, res) {
    const { applicant_id } = req.params;

    try {
      const options = {
        where: { id: applicant_id },
        include: [
          {
            model: ClientSpouse,
            as: 'spouse',
            attributes: [
              'id',
              'name',
              'phone_number',
              [
                sequelize.literal(`(
              SELECT name
              FROM occupation
              WHERE
                occupation.id = spouse.occupation_id
              )`),
                'occupation',
              ],
            ],
          },
          {
            model: Identification,
            as: 'identity',
            attributes: [
              'id',
              [
                sequelize.literal(`(
              SELECT name
              FROM identity_types
              WHERE
                identity_types.id = identity.identity_type_id
              )`),
                'identity_type',
              ],
              'id_card_number',
              'date_issued',
              'expiry_date_issued',
              'identity_type_id',
            ],
          },
          { model: Education, as: 'education' },
          { model: Occupation, as: 'occupation' },
          { model: State, as: 'place_of_birth', attributes: ['id', 'name'] },
          { model: Lga, as: 'lga', attributes: { exclude: ['state_id'] } },
          {
            model: BusinessEmployment,
            as: 'business_employment',
            include: [{ model: BusinessEmploymentType, as: 'business_employment_type' }],
          },
          {
            model: ClientBank,
            as: 'bank_details',
            attributes: [
              'id',
              'bank_id',
              [
                sequelize.literal(`(
              SELECT name
              FROM banks
              WHERE
                  banks.id = bank_details.bank_id
              )`),
                'bank_name',
              ],
              'account_name',
              'account_number',
            ],
          },
        ],
        order: [
          ['business_employment', 'id', 'DESC'],
          ['bank_details', 'id', 'DESC'],
        ],
      };

      const applicant = await Applicants.findOne(options);
      if (!applicant) throw new CustomError(`Loan Application not found!`, 404);

      util.setSuccess(200, 'successful', applicant);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateApplicant(req, res) {
    const t = await sequelize.transaction();
    const { user } = req;
    const { applicant_id } = req.params;

    try {
      // if applicant already have loan attached, allow admin, if not [loan office and super] can update
      // update applicant and client bank
      const payload = pick(req.body, APPLICANT);
      await validateApplicant().validateAsync(payload);

      const applicant = await Applicants.findOrFail(applicant_id);

      const {
        spouse_name: name,
        spouse_phone_number: phone_number,
        spouse_occupation_id: occupation_id,

        identity_type_id,
        id_card_number,
        date_issued,
        expiry_date_issued,

        // bank_details,

        ...data
      } = payload;

      if (moment(expiry_date_issued).format() < moment().format()) {
        throw new CustomError('Invalid identification, expiry date needs to be in the future');
      }

      // const banks = [];
      // bank_details.map((bank) =>
      //   banks.push({
      //     applicant_id: applicant.id,
      //     ...bank,
      //   })
      // );

      // await ClientBank.bulkCreate(banks, { updateOnDuplicate: ['account_number'], transaction: t });
      // await applicant.setBankDetails(banks, { transaction: t });

      await Identification.update(
        { identity_type_id, id_card_number, date_issued, expiry_date_issued },
        { where: { id: applicant.identification_id } },
        { transaction: t }
      );

      await ClientSpouse.update(
        { name, phone_number, occupation_id },
        { where: { id: applicant.spouse_id } },
        { transaction: t }
      );

      await applicant.update({ ...data }, { transaction: t });

      await t.commit();

      activityLog('ip', user, 'applicant_update', {
        applicant_id: applicant.id,
      });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
}

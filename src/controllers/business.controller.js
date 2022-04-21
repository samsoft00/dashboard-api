import { pick } from 'lodash';
import {
  sequelize,
  Applicants,
  BusinessEmployment,
  BusinessEmploymentType,
} from '../database/models';
import ErrorHandler from '../errors/error.handler';
import ValidatorHelper from '../utils/ValidatorHelper';
import CustomError from '../utils/CustomError';
import Utility from '../utils/Utility';
import RespUtil from '../utils/RespUtil';

const { activityLog } = Utility;
const { validateBusiness } = ValidatorHelper;
const util = new RespUtil();

const BUSINESS_EMPLOYMENT_FIELDS = [
  'business_name',
  'business_employment_type_id',
  'business_office_address',
  'business_activity',
  'year_of_experience',
  'office_phone_no',
  'email_address',
  'position',
  'monthly_income',
  'monthly_expenses',
];

/**
 * Business & Employment Controller
 */

export default class BusinessController {
  static async getBusinessEmply(req, res) {
    const { applicant_id, emply_id: id } = req.params;

    try {
      const businessEmply = await BusinessEmployment.findOne({
        where: { id, applicant_id },
        include: [{ model: BusinessEmploymentType, as: 'business_employment_type' }],
      });
      if (!businessEmply)
        throw new CustomError('Applicant Business/Employment information not found!');

      util.setSuccess(200, 'successful', businessEmply);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async addBusinessEmply(req, res) {
    const t = await sequelize.transaction();
    const { applicant_id } = req.params;
    const data = pick(req.body, BUSINESS_EMPLOYMENT_FIELDS);

    try {
      await Applicants.findOrFail(applicant_id);

      await validateBusiness().validateAsync(data);

      const busEmply = await BusinessEmploymentType.findByPk(data.business_employment_type_id);
      if (!busEmply)
        throw new CustomError(
          `Business employment type with ID ${data.business_employment_type_id} not found!`
        );

      const businessEmp = await BusinessEmployment.create(
        { ...data, applicant_id },
        { transaction: t }
      );

      await t.commit();
      activityLog(req.headers['x-real-ip'], req.user, 'CREATE_BUSINESS_EMPLOY', {
        id: businessEmp.id,
      });

      util.setSuccess(200, 'successful', businessEmp);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateBusinessEmply(req, res) {
    const { applicant_id, emply_id: id } = req.params;
    const payload = pick(req.body, BUSINESS_EMPLOYMENT_FIELDS);

    try {
      await validateBusiness().validateAsync(payload);

      const businessEmply = await BusinessEmployment.findOrFail({ id, applicant_id });
      await businessEmply.update({ ...payload, applicant_id });

      // const r = await businessEmply.reload();

      activityLog(req.headers['x-real-ip'], req.user, 'UPDATE_BUSINESS_EMPLOY', { id });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async deleteBusinessEmply(req, res) {
    const { applicant_id, emply_id: id } = req.params;

    try {
      const businessEmply = await BusinessEmployment.findOrFail({ id, applicant_id });
      await businessEmply.destroy();

      activityLog(req.headers['x-real-ip'], req.user, 'DELETE_BUSINESS_EMPLOY', { id });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
}

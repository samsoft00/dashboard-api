/* eslint-disable no-case-declarations */
/* eslint-disable radix */
/**
 * CRU Loan object.
 * Assign Loan object to User object
 * Manage loan state (state update should indicate who moved it from one stateto the other.)
 * Get loan applications by state
 * Get loan applications assigned to user
 */

import { QueryTypes } from 'sequelize';
import Joi, { ValidationError } from '@hapi/joi';
import { pick, find, merge, isUndefined } from 'lodash';
import moment from 'moment';
import qs from 'qs';

import {
  sequelize,
  LoanApplication,
  LoanAppComment,
  Applicants,
  LoanAppCheckList,
  LoanLogs,
  Department,
  LoanState,
  LoanSource,
  CheckList,
  ApproveAuthority,
  ClientSpouse,
  Identification,
  Education,
  Occupation,
  BusinessEmploymentType,
  BusinessEmployment,
  State,
  Lga,
  User,
  LoanType,
  ClientBank,
  Roles,
} from '../database/models';
import CustomError from '../utils/CustomError';
import Utility from '../utils/Utility';
import LoanService from '../services/loan.service';
import RespUtil from '../utils/RespUtil';
import Paginate from '../utils/Pagination';
import ValidationHelper from '../utils/ValidatorHelper';
import ErrorHandler from '../errors/error.handler';
import Generator from '../utils/Generator';
import LoanResponse from '../response/loan.response';
import { QueueService } from '../services/queue.service';

const util = new RespUtil();
const { newPagHandler, activityLog } = Utility;
const { validateManageLoan, validateLoanDocUpload, validateLoanApp, validateLoanExport } =
  ValidationHelper;

const sendAssignToMail = new QueueService('send-assign-to-mail');
const exportLoanToCsv = new QueueService('export-loan-to-csv');
const loanQueue = new QueueService('loan-queue');

const REQ_UPDATE_NEW = 'Request denied, the current loan application is new';

// repeat_loan
// 'registration_status',
// 'require_approval',
// 'current_state_id',
// 'current_step_id',

const LOAN_APPLICATION = [
  'amount',
  'repayment_frequency', // weekly, monthly, yearly
  'monthly_repayment_amount',
  'maturity_tenor',
  'collateral_offered',
  'purpose',

  'loan_source_id',
  'loan_type_id',
  'business_employment_id',
  'bank_detail_id',
];
export default class LoanController {
  /**
    Loan Officer with highest loans logged 
    Loan status by department 
    Loans disbursed 
    Loan applications completed
   */
  static async loanSummaryApi(req, res) {
    const loan_source = req.query.loan_source || 1;

    try {
      const source = await LoanSource.findOne({ where: { id: loan_source } });
      if (!source) throw new CustomError(``);

      const applicants = await sequelize.query(`
        SELECT count(DISTINCT a.id) total_applicant 
        FROM applicants a 
        INNER JOIN loans l ON a.id = l.applicant_id AND l.loan_source_id = ${source.id}
      `);

      // Loan Officer with highest loans logged
      const highest_logged = await sequelize.query(
        `
            SELECT u.fullname AS name, count(DISTINCT loan_id) AS total_log
            FROM user u
              INNER JOIN department dept ON u.department_id = dept.id AND dept.slug = 'LOAN_OFFICER'
              LEFT JOIN loan_logs log ON u.id = log.from_who_id
            GROUP BY u.id
            ORDER BY total_log DESC
            LIMIT 1
        `,
        { type: QueryTypes.SELECT }
      );

      // Loan status by department
      const dept_status = await sequelize.query(
        `
        SELECT d.name AS dept, COUNT(loan.id) AS waiting_approval
        FROM department d
          LEFT JOIN loans loan
          ON d.id = loan.current_step_id AND loan.loan_source_id = ${source.id}
        WHERE slug IN ('LOAN_OFFICER', 'TEAM_SUPERVISOR', 'RISK_MANAGEMENT', 'MANAGEMENT', 'OPERATION')
        GROUP by d.name
        ORDER BY waiting_approval DESC
        `,
        { type: QueryTypes.SELECT }
      );

      const loan = await sequelize.query(
        `
        SELECT 
          sum(case when state.slug = 'CLOSED' then loan.amount else 0 end) AS total_disbursed,
          COUNT(case when state.slug = 'CLOSED' then loan.id else 0 end) AS loan_completed,	
          sum(case when state.slug = 'DISBURSEMENT' then loan.amount else 0.00 end) AS pending_disbursement
        FROM loans loan
        INNER JOIN loan_states state ON loan.current_state_id = state.id AND loan.loan_source_id = ${source.id}
        `,
        { type: QueryTypes.SELECT }
      );

      // Loan applications completed
      // const loan_completed = await sequelize.query(
      //   `
      //   SELECT coalesce(COUNT(loan.id), 0) AS loan_completed
      //   FROM loans loan
      //     INNER JOIN loan_states state ON loan.current_state_id = state.id
      //       AND state.slug = 'CLOSED'
      //       AND loan.loan_source_id = ${source.id}
      //   `,
      //   { type: QueryTypes.SELECT }
      // );

      // Loans disbursed
      // INNER JOIN loan_detail detail ON loan.loan_detail_id = detail.id
      // const total_disbursed = await sequelize.query(
      //   `
      //       SELECT coalesce(SUM(amount), 0) AS total_disbursed
      //       FROM loans loan
      //         INNER JOIN loan_states state ON loan.current_state_id = state.id
      //           AND state.slug = 'CLOSED'
      //           AND loan.loan_source_id = ${source.id}
      //   `,
      //   { type: QueryTypes.SELECT }
      // );

      util.setSuccess(200, 'successful', {
        loan_source: `${source.name} (${source.slug})`,
        highest_logged: highest_logged[0],
        dept_status,
        total_applicant: applicants[0].total_applicant,
        ...loan[0],
      });
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async startNewLoanApplication(req, res) {
    const t = await sequelize.transaction();
    const { applicant_id } = req.params;
    const { user } = req;

    try {
      const payload = pick(req.body, LOAN_APPLICATION);
      await validateLoanApp().validateAsync(payload);

      const co = payload.collateral_offered;
      if (/nil/.test(co) || /nill/.test(co) || /null/.test(co)) {
        throw new CustomError('Nill is not acceptable collateral');
      }

      const applicant = await Applicants.findOrFail(applicant_id);
      if (!applicant.isRegisCompleted())
        throw new CustomError('No business/employment or bank details attach to applicant');

      const hasPendingLoan = await applicant.hasPendingLoan();
      if (hasPendingLoan)
        throw new CustomError(
          `You can not create new Loan, ${applicant.name.split(' ')[0]} has pending loan`
        );

      const slug = user.department.slug === 'TEAM_SUPERVISOR' ? 'IN_PROGRESS' : 'NEW';
      const loanState = await LoanState.findOne({ where: { slug } });

      const loan = await LoanApplication.create(
        {
          refrence_no: `${Generator.randomNumber(8)}`,
          applicant_id,
          repeat_loan: applicant.isRepeatedLoan(),
          ...payload,
          current_step_id: user.department.id,
          current_state_id: loanState.id,
          registration_status: 'pending',
          user_id: user.id,
        },
        { transaction: t }
      );

      await t.commit();

      // Setup checklists
      let checkListIds = await CheckList.findAll({ attributes: ['id'] });
      checkListIds = checkListIds.map((check) => check.id);
      await loan.setDocs(checkListIds, { doc_url: null });

      activityLog(req.headers['x-real-ip'], req.user, 'CREATE_LOAN', { loan_id: loan.id });

      util.setSuccess(200, 'successful', loan);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async updateLoanApplication(req, res) {
    const t = await sequelize.transaction();
    const { user } = req;
    const { loan_id } = req.params;

    try {
      const loan = await LoanApplication.findOrFail(loan_id, {
        registration_status: { $or: ['completed', 'update_required'] },
      });

      // check if loan already closed || rejected
      if (loan.isClosed()) {
        throw new CustomError('Oops, Loan application already closed or rejected');
      }

      const payload = pick(req.body, LOAN_APPLICATION);
      await validateLoanApp().validateAsync(payload);

      await loan.update(payload, { transaction: t });

      await t.commit();

      activityLog('ip', user, 'loan_update', {
        loan_id: loan.id,
      });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /** Manage loan state - state update should indicate who moved it from one stateto the other. */
  static async manageLoanApp(req, res) {
    const t = await sequelize.transaction();

    const { user } = req;
    const { loan, iterator } = req.payload;

    try {
      const payload = pick(req.body, ['comment', 'assign_to', 'request_update']);
      const value = await validateManageLoan().validateAsync(payload);

      // get to who, check if he belong to next user
      let assignedTo = value.assign_to
        ? await User.findOne({
            where: { id: value.assign_to },
            include: [{ model: Department, as: 'department' }],
          })
        : undefined;

      const logger = {};
      const loanUpds = {};
      let isClosed = false;

      // OPERATION is the last step
      if (loan.current_step.slug !== 'OPERATION' && !iterator.valid())
        throw new Error('Error 3404: Unknown data attack!');

      if (value.request_update && loan.current_state.slug === 'NEW') {
        throw new CustomError(REQ_UPDATE_NEW);
      }

      const { next_state, next_step, timeline } = await LoanService.loanNextLevel(
        loan,
        iterator,
        assignedTo,
        value.request_update,
        req.query,
        user
      );

      // if (!iterator.valid()) throw new Error('Error 3404: Unknown data attack!');
      // const { next_state, next_step } = iterator.next();

      // if (!next_state || !next_step) throw new Error('Error 3404: Unknown data attack!');
      if (next_state.slug === 'CLOSED' && next_step.slug === 'OPERATION') {
        isClosed = true;
        assignedTo = undefined;
      }
      if (next_state.slug === 'REJECTED' && next_step.slug === 'AUDIT') {
        assignedTo = undefined;
        merge(value, { request_update: false });
      }

      if (assignedTo && assignedTo.department.id !== next_step.id)
        throw new CustomError(
          `${
            assignedTo.fullname
          } is not in ${next_step.name.toLowerCase()}, please assign to another staff`
        );

      const to_who = assignedTo ? assignedTo.id : null;
      merge(logger, {
        loan_id: loan.id,
        from_id: loan.current_state.id,
        to_id: next_state.id,
        from_who_id: user.id,
        assign_to_id: to_who,
        dept_id: next_step.id,
        comment: value.comment,
        timeline: moment().add(timeline, 'hours').toDate(),
      });

      if (value.request_update) {
        // Go back to loan officer
        merge(loanUpds, {
          current_state_id: next_state.id,
          current_step_id: next_step.id,
          registration_status: 'update_required',
        });
      } else {
        merge(loanUpds, {
          registration_status: 'completed',
          current_state_id: next_state.id,
          current_step_id: next_step.id,
        });
      }

      await LoanLogs.create(logger, { transaction: t });
      const updatedLoan = await loan.update({ ...loanUpds }, { transaction: t });

      await t.commit();

      // setup approval
      await Promise.all([
        loanQueue.topic('manage-loan-state').publish({ loan_id: updatedLoan.id }),
        sendAssignToMail.topic('sendAssignToMail').publish({ loan: updatedLoan }),
      ]);

      if (isClosed) {
        await loanQueue.topic('confirm-account-number').publish({ loan_id: updatedLoan.id });
      }

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      console.log(e);
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  // Files Upload
  static async uploadLoanAppFiles(req, res) {
    const { loan_id } = req.params;
    const { user } = req;

    try {
      // [{check_list_id, doc_url}]
      const payload = pick(req.body, ['uploads']);

      const value = await validateLoanDocUpload().validateAsync(payload);

      const loanApp = await LoanApplication.findOne({
        where: { id: loan_id },
        include: [
          { model: CheckList, as: 'docs' },
          { model: LoanState, as: 'current_state' },
        ],
      });
      if (!loanApp) throw new CustomError(`Loan Application with ID ${loan_id} not found!`);
      let isOfferLetter = false;

      const updatedList = loanApp.docs.map((check) => {
        const chcker = find(value.uploads, { check_list_id: check.id });

        // check if uploaded file is offer letter
        if (chcker && check.name.toLowerCase() === 'signed offer letter') {
          isOfferLetter = true;
        }

        if (chcker)
          return {
            loan_application_id: loanApp.id,
            check_list_id: check.id,
            doc_url: chcker.doc_url,
          };

        if (check.LoanAppCheckList.doc_url) {
          const { loan_application_id, check_list_id, doc_url } = check.LoanAppCheckList;
          return {
            loan_application_id,
            check_list_id,
            doc_url,
          };
        }

        return {
          loan_application_id: loanApp.id,
          check_list_id: check.id,
          doc_url: null,
        };
      });

      await LoanAppCheckList.bulkCreate(updatedList, {
        updateOnDuplicate: ['check_list_id', 'loan_application_id', 'doc_url'],
      });

      // const upload_status = updatedList
      //   .filter((list) => list.check_list_id !== signedOfferCheckId)
      //   .every((list) => list.doc_url !== null);

      if (loanApp.registration_status === 'pending') {
        await loanApp.update({ registration_status: 'completed' });
      }

      // update state and move it to audit
      if (isOfferLetter && loanApp.current_state.slug === 'OFFER_LETTER') {
        await loanQueue.topic('move-loan-audit').publish({ loan: loanApp, user_id: user.id });
        // await loanQueue.add(
        //   'move-loan-audit',
        //   { loan: loanApp, user_id: user.id },
        //   { attempts: 3 }
        // );
      }

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  // Endpoint to fetch list of uploaded documents for each loan application
  static async getLoanAppChecklist(req, res) {
    const { loan_id } = req.params;

    try {
      const checkList = await LoanService.getLoanCheckList(loan_id);

      util.setSuccess(200, 'successful', checkList || []);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * [getLoanAppByDept, getLoanAppAssignToUser]
   * [https://sequelize.org/master/manual/eager-loading.html#complex-where-clauses-at-the-top-level]
   */
  static async getLoanAppByLoggedInUser(req, res) {
    const { user } = req;
    const { page, limit, loan_type, loan_source } = req.query;

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      const states = await LoanService.getLoanStateByDept(user.department);

      const whereQry = {};
      const logReq = {};
      const loanTypeReq = {};

      if (states.length) {
        merge(whereQry, { '$current_state.id$': { $in: states } });
        merge(logReq, { required: true });
      }

      merge(whereQry, { '$current_step.id$': { $eq: user.department.id } });
      if (loan_type) {
        merge(whereQry, { '$loan_type.id$': { $eq: loan_type } });
        merge(loanTypeReq, { required: true });
      }

      if (loan_source) {
        merge(whereQry, { '$loan_source.id$': { $eq: loan_source } });
      }

      const options = {
        where: whereQry,
        include: [
          { model: Applicants, as: 'applicant' },
          { model: LoanState, as: 'current_state', ...logReq },
          { model: Department, as: 'current_step', required: true },
          { model: LoanType, as: 'loan_type', ...loanTypeReq },
          { model: LoanSource, as: 'loan_source', required: true },
          /*
          {
            model: LoanLogs,
            as: 'logs',
            include: [
              { model: Department, as: 'desk' },
              { model: User, as: 'assign_to' },
            ],
          },
          */
        ],
        ...pagOptns,
        subQuery: false,
      };

      const loans = await LoanApplication.findAndCountAll(options);

      util.setPagination(new Paginate(loans, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', loans.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /** GET application by application loan ID */
  static async getLoanApplicationByID(req, res) {
    const { loan_id } = req.params;

    try {
      const options = {
        where: { id: loan_id },
        attributes: {
          exclude: ['business_employment_id', 'loan_source_id', 'bank_detail_id'],
          include: [
            [
              sequelize.literal(
                `(SELECT CONCAT(u.fullname, ' (', d.name, ')')  FROM user u 
                INNER JOIN department d ON u.department_id = d.id WHERE LoanApplication.user_id = u.id)`
              ),
              'created_by',
            ],
          ],
        },
        include: [
          { model: LoanType, as: 'loan_type' },
          { model: LoanSource, as: 'loan_source' },
          { model: LoanState, as: 'current_state', attributes: { exclude: ['order'] } },
          {
            model: Department,
            as: 'current_step',
            attributes: { exclude: ['loan_process_order', 'description'] },
          },
          {
            model: BusinessEmployment,
            as: 'business_employment',
            include: [{ model: BusinessEmploymentType, as: 'business_employment_type' }],
          },
          {
            model: ClientBank,
            as: 'client_bank',
            attributes: [
              'id',
              'bank_id',
              [
                sequelize.literal(`(
              SELECT name
              FROM banks
              WHERE
                  banks.id = client_bank.bank_id
              )`),
                'bank_name',
              ],
              'account_name',
              'account_number',
            ],
          },
          {
            model: ApproveAuthority,
            as: 'approve_authority',
            attributes: [
              'id',
              [
                sequelize.literal(`(
            SELECT name FROM roles WHERE roles.id = approve_authority.role_id
          )`),
                'authority',
              ],
              'status',
            ],
          },
          {
            model: LoanAppComment,
            as: 'comments',
            attributes: [
              'id',
              [
                sequelize.literal(`(
              SELECT CONCAT(u.fullname, " (", d.name, ") comment") title
              FROM user u
                INNER JOIN department d ON u.department_id = d.id
              WHERE u.id = comments.user_id
            )`),
                'title',
              ],
              'comment',
              'created_at',
            ],
            // attributes: { exclude: ['loan_id', 'user_id', 'updated_at'] },
          },
          {
            model: LoanLogs,
            as: 'logs',
            attributes: ['id', 'timeline', 'comment', 'created_at'],
            include: [
              { model: User, as: 'from_who', attributes: ['id', 'fullname', 'username', 'email'] },
              { model: User, as: 'assign_to', attributes: ['id', 'fullname', 'username', 'email'] },
              'from',
              'to',
              'desk',
            ],
          },
        ],
        order: [
          ['comments', 'created_at', 'DESC'],
          ['logs', 'created_at', 'DESC'],
        ],
      };

      const loanApp = await LoanApplication.findOne(options);
      if (!loanApp) throw new CustomError(`Loan Application with ID ${loan_id} not found!`, 404);

      const applicantOptn = {
        where: { id: loanApp.applicant_id },
        attributes: {
          exclude: ['created_at', 'updated_at'],
        },
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
        ],
      };

      const applicant = await Applicants.findOne(applicantOptn);
      const checkList = await LoanService.getLoanCheckList(loan_id);

      util.setSuccess(200, 'successful', new LoanResponse(loanApp, applicant, checkList));
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Name (searchable)
   * Registration Status [pending, completed]
   * Loan Status: [DISBURSED, REJECTED]
   */
  static async getAllLoanApplication(req, res) {
    const { page, limit, name, ...rest } = qs.parse(req.query);

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    const reg_status = ['pending', 'completed'];
    const state = ['disbursement', 'rejected'];

    try {
      const whereQry = {};
      const logReq = {};
      const loanTypeReq = {};

      if (!isUndefined(rest.loan_status) && state.indexOf(rest.loan_status) > -1) {
        const loanState = await LoanService.getLoanState(rest.loan_status.toUpperCase());

        merge(whereQry, { '$current_state.id$': { $eq: loanState.id } });
        merge(logReq, { required: true });
      }

      if (
        !isUndefined(rest.registration_status) &&
        reg_status.indexOf(rest.registration_status) > -1
      ) {
        merge(whereQry, { registration_status: { $eq: rest.registration_status } });
      }

      if (!isUndefined(name) && name !== '')
        merge(whereQry, { '$applicant.name$': { $like: `%${name}%` } });

      if (rest.loan_type && rest.loan_type !== '') {
        merge(whereQry, { '$loan_type.id$': { $eq: rest.loan_type } });
        merge(loanTypeReq, { required: true });
      }

      if (!isUndefined(rest.loan_source) && rest.loan_source !== '') {
        merge(whereQry, { '$loan_source.id$': { $eq: rest.loan_source } });
      }

      if (!isUndefined(rest.date_range) && rest.date_range !== '') {
        let [start_date, end_date] = rest.date_range.split('|');

        start_date = moment(start_date, 'YYYY-MM-DD').startOf('day').toDate();
        end_date = moment(end_date, 'YYYY-MM-DD').endOf('day').toDate();

        merge(whereQry, {
          created_at: {
            $between: [start_date, end_date],
          },
        });
      }

      const options = {
        where: whereQry,
        include: [
          { model: Applicants, as: 'applicant' },
          { model: LoanState, as: 'current_state', ...logReq },
          { model: Department, as: 'current_step', required: true },
          { model: LoanType, as: 'loan_type', ...loanTypeReq },
          { model: LoanSource, as: 'loan_source', required: true },
        ],
        ...pagOptns,
        subQuery: false,
      };

      const loans = await LoanApplication.findAndCountAll(options);

      util.setPagination(new Paginate(loans, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', loans.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Get loan states
   */
  static async loanApprovalByLoanId(req, res) {
    const { loan_id, approval_id } = req.params;
    const { user } = req;

    try {
      const loanApp = await LoanApplication.findOne({
        where: { id: loan_id },
        include: [
          { model: LoanState, as: 'current_state' },
          {
            model: ApproveAuthority,
            as: 'approve_authority',
            attributes: ['id', 'status'],
            include: [{ model: Roles, as: 'role' }],
          },
        ],
      });

      if (!loanApp) throw new CustomError(`Loan Application with ID ${loan_id} not found!`);

      if (!loanApp.require_approval)
        throw new CustomError(`Loan Application with ${loan_id} already approve`);

      const appAuth = loanApp.approve_authority.filter(
        (app) => app.id === parseInt(approval_id)
      )[0];
      if (!appAuth) throw new Error('Wrong approval ID');

      const check = user.roles.filter((x) => x.code === appAuth.role.code)[0];
      if (!check) throw new CustomError('You are not permitted to approve this loan application');

      // update approval auth
      await ApproveAuthority.update(
        { user_id: user.id, status: true },
        { where: { id: approval_id } }
      );

      const result = await loanApp.reload();
      if (result.approve_authority.every((approve) => approve.status === true)) {
        // await result.update({ require_approval: false });
        await loanQueue
          .topic('move-loan-offer')
          .publish({ loan: result, user_id: user.id, approval_id });
        // await loanQueue.add(
        //   'move-loan-offer',
        //   { loan: result, user_id: user.id, approval_id },
        //   { attempts: 3 }
        // );
      }

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /*
  static async setupFailApproval(req, res) {
    const { loan_id } = req.params;

    try {
      const loan = await LoanApplication.findOne({ where: { id: loan_id } });
      if (!loan) throw new CustomError(`Loan with ID ${loan_id} not found!`);

      await loanQueue.add('manage-loan-state', { loan_id: loan.id }, { attempts: 3 });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
  
  /**
   * Duplicate loan
   */
  // eslint-disable-next-line no-unused-vars
  static async duplicateLoan(req, res) {
    const t = await sequelize.transaction();
    const { loan_id } = req.params;
    const { user } = req;

    try {
      const payload = pick(req.body, ['purpose']);

      const schema = Joi.object().keys({
        purpose: Joi.string().required().error(new ValidationError('Loan purpose is required')),
      });
      await schema.validateAsync(payload);

      const l = await LoanApplication.findOne({
        where: { id: loan_id },
        attributes: {
          include: ['loan_source_id', 'loan_type_id', 'business_employment_id', 'bank_detail_id'],
        },
        include: [{ model: CheckList, as: 'docs' }],
      });
      if (!l) throw new CustomError('Loan Application not found');

      const a = await Applicants.findOrFail(l.applicant_id);

      if (l.registration_status !== 'completed') {
        throw new CustomError("You can't duplicate uncompleted loan application");
      }

      if (!a.isRegisCompleted())
        throw new CustomError('No business/employment or bank details attach to applicant');

      const hasPendingLoan = await a.hasPendingLoan();
      if (hasPendingLoan)
        throw new CustomError(
          `You can not create new Loan, ${a.name.split(' ')[0]} has pending loan`
        );

      const slug = user.department.slug === 'TEAM_SUPERVISOR' ? 'IN_PROGRESS' : 'NEW';
      const ls = await LoanState.findOne({ where: { slug } });

      const {
        amount,
        monthly_repayment_amount,
        repayment_frequency,
        maturity_tenor,
        collateral_offered,
        business_employment_id,
        bank_detail_id,
        loan_source_id,
        loan_type_id,
        docs,
      } = l.toJSON();

      const loan = await LoanApplication.create(
        {
          refrence_no: `${Generator.randomNumber(8)}`,
          applicant_id: a.id,
          repeat_loan: true,
          amount,
          monthly_repayment_amount,
          repayment_frequency,
          maturity_tenor,
          collateral_offered,
          loan_source_id,
          loan_type_id,
          business_employment_id,
          bank_detail_id,
          purpose: payload.purpose,
          current_step_id: user.department.id,
          current_state_id: ls.id,
          registration_status: 'pending',
        },
        { transaction: t }
      );

      const checkLists = docs.map((d) => {
        return {
          check_list_id: d.id,
          loan_application_id: loan.id,
          doc_url:
            d.name.toLowerCase() === 'signed offer letter' ? null : d.LoanAppCheckList.doc_url,
        };
      });

      await LoanAppCheckList.bulkCreate(checkLists, { transaction: t });
      await loan.update({ registration_status: 'completed' }, { transaction: t });

      await t.commit();

      activityLog(req.headers['x-real-ip'], user, 'CREATE_LOAN', { loan_id: loan.id });

      const lreload = await loan.reload();

      util.setSuccess(200, 'successful', lreload);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Loan comments
   */
  static async addLoanAppComment(req, res) {
    const { user } = req;
    const { loan_id } = req.params;

    try {
      const schema = Joi.object({
        comment: Joi.string()
          .min(5)
          .required()
          .error(
            new ValidationError(
              'Kindly add comment before you proceed, comment must be at least 5 character long!'
            )
          ),
      });
      await schema.validateAsync(req.body);

      const loanApp = await LoanApplication.findOne({ where: { id: loan_id } });
      if (!loanApp) throw new CustomError(`Loan applicantion with ID ${loan_id} not found!`, 404);

      await LoanAppComment.create({
        user_id: user.id,
        loan_id,
        comment: req.body.comment,
      });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async deleteLoanAppComment(req, res) {
    const { user } = req;
    const { loan_id, comment_id } = req.params;

    try {
      const schema = Joi.object({
        loan_id: Joi.string().required(),
        comment_id: Joi.number().required(),
      });
      await schema.validateAsync({ loan_id, comment_id });

      const comment = await LoanAppComment.findOne({
        where: {
          $and: [{ id: comment_id }, { loan_id }],
        },
      });
      if (!comment) throw new CustomError(`Comment not found, kindly, refresh and try again!`);

      if (comment.user_id !== user.id)
        throw new CustomError(`Oops, you don't have permission to delete this comment!`, 404);

      await comment.destroy();

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * Export Loans to CSV
   * Filter
   * Loan Source: loan_source
   * Date: date_range
   * Loan Type: loan_type (SAP and AMFB)
   */
  static async exportLoanToCSV(req, res) {
    const { user } = req;
    const { date_range, loan_type, loan_source } = req.query;

    const reportDetails = { title: `Loans Report Ready - ${moment().format('YYYY-MM-DD')}` };

    try {
      const whereQry = {};

      const loanSource = await LoanSource.findOne({ where: { id: loan_source } });
      if (!loanSource) throw new CustomError('Loan source not found!');

      if (!isUndefined(date_range) && date_range !== '') {
        let [start_date, end_date] = date_range.split('|');

        await validateLoanExport().validateAsync({
          start_date,
          end_date,
          loan_type,
          loan_source,
        });

        Object.assign(reportDetails, {
          title: `Loans Report for ${start_date} - ${end_date}`,
          start_date,
          end_date,
        });

        start_date = moment(start_date, 'YYYY-MM-DD').startOf('day').toDate();
        end_date = moment(end_date, 'YYYY-MM-DD').endOf('day').toDate();

        merge(whereQry, {
          created_at: {
            $between: [start_date, end_date],
          },
        });
      }

      if (!isUndefined(loan_type) && loan_type !== '') {
        merge(whereQry, { '$loan_type.id$': { $eq: loan_type } });
      }

      if (!isUndefined(loan_source) && loan_source !== '') {
        merge(whereQry, { '$loan_source.id$': { $eq: loan_source } });
      }

      await exportLoanToCsv.topic('exportFileToCsv').publish({ whereQry, user, reportDetails });

      util.setSuccess(200, 'Request processed, Report will be send to your email shortly!', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}

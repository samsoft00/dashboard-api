/* eslint-disable radix */
import { pick, merge, isUndefined } from 'lodash';
import moment from 'moment';
import qs from 'qs';

import { QueryTypes } from 'sequelize';
import {
  sequelize,
  FxOrder,
  FxOrderLogs,
  BankDetail,
  User,
  FxState,
  Department,
  CurrencyType,
  TransactionTypes,
  FxOrderComment,
  FxBeneficiary,
  FxOrderSupportDoc,
} from '../database/models';
import FxService from '../services/fx.service';
import Utility from '../utils/Utility';
import CustomError from '../utils/CustomError';
import RespUtil from '../utils/RespUtil';
import ValidatorHelper from '../utils/ValidatorHelper';
import Paginate from '../utils/Pagination';
import Generator from '../utils/Generator';
import UploadService from '../services/upload.service';
import FxOrderResponse from '../response/fxorder.response';
import ErrorHandler from '../errors/error.handler';
import FxFlow from '../flow/FxFlow';
import fxjson from '../flow/fx.json';
import { QueueService } from '../services/queue.service';

const util = new RespUtil();

// const saveDetails = new Queue('save-beneficiary-details', { connection });
const fxOrderCreated = new QueueService('fx-order-created');
const sendAssignToMailFx = new QueueService('send-assign-to-mail-fx');
const exportFileToCsv = new QueueService('export-file-to-csv-mail');

const { newPagHandler } = Utility;
const {
  validateOutflow,
  validateSupportDoc,
  validateInflow,
  validateManageLoan,
  validateExportDate,
} = ValidatorHelper;

const fxOrderPayload = {
  outflow: {
    validation: validateOutflow(),
    params: [
      'transaction_type_id',
      'volume',
      'exchange_rate',
      'currency_from_id',
      'currency_to_id',
      'receiving_bank',
      'beneficiary_details',
      'payment_source',
      'total_payment',
      'bank_charges',
      'other_charges',
      'tranx_purpose',
      'priority',
      'customer',
    ],
  },
  inflow: {
    validation: validateInflow(),
    params: [
      'transaction_type_id',
      'volume',
      'exchange_rate',
      'currency_from_id',
      'currency_to_id',
      'receiving_bank',
      'beneficiary_details',
      'payment_source',
      'total_payment',
      'priority',
      'customer',
    ],
  },
};

const DEFAULT_OPTIONS = {
  // abortEarly: false,
  stripUnknown: { object: true },
};

/**
 * Fx processing controller
 */
export default class FxController {
  static async fetchAllFxOrder(req, res) {
    const { page, limit, reference_no, customer_name, transaction_type, date_range } = qs.parse(
      req.query
    );

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      const whereQry = {};

      if (!isUndefined(reference_no) && reference_no !== '') {
        merge(whereQry, { reference_no: { $eq: reference_no } });
      }

      // if (!isUndefined(invoice_no) && invoice_no !== '') {
      //   merge(whereQry, { invoice_no: { $eq: invoice_no } });
      // }

      if (!isUndefined(date_range) && date_range !== '') {
        let [startDate, endDate] = date_range.split('|');

        startDate = moment(startDate).startOf('day').toDate();
        endDate = moment(endDate).endOf('day').toDate();

        merge(whereQry, {
          created_at: {
            $between: [startDate, endDate],
          },
        });
      }

      const trxQry = {};
      if (!isUndefined(transaction_type) && transaction_type !== '') {
        merge(whereQry, { '$transaction_type.id$': { $eq: transaction_type } });
        merge(trxQry, { required: true });
      }

      if (!isUndefined(customer_name) && customer_name !== '') {
        merge(whereQry, { customer: { name: { $like: `%${customer_name}%` } } });
      }

      const options = {
        where: whereQry,
        attributes: {
          exclude: ['currency_type_id', 'current_state_id', 'current_step_id'],
        },
        include: [
          { model: CurrencyType, as: 'currency_from' },
          { model: CurrencyType, as: 'currency_to' },
          { model: TransactionTypes, as: 'transaction_type', ...trxQry },
          { model: FxState, as: 'current_state', attributes: { exclude: ['order'] } },
          {
            model: Department,
            as: 'current_step',
            attributes: { exclude: ['loan_process_order', 'description'] },
          },
        ],
        ...pagOptns,
        subQuery: false,
      };

      const fx_orders = await FxOrder.findAndCountAll(options);
      const response = fx_orders.rows.map((data) => new FxOrderResponse(data));

      util.setPagination(new Paginate(fx_orders, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', response);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async createFxOrder(req, res) {
    const t = await sequelize.transaction();

    const i = ['swap', 'refund', 'inflow'];
    const { transaction_type_id } = req.body;
    const { user } = req;

    try {
      const starter = await FxState.findOne({ where: { slug: 'NEW' } });

      const tranxType = await TransactionTypes.findByPk(transaction_type_id);
      if (!tranxType) throw new CustomError(`Invalid transaction type`);

      let tranxTypeName = tranxType.name.toLowerCase();
      if (i.indexOf(tranxType.name.toLowerCase()) > -1) tranxTypeName = 'inflow';

      const { validation, params } = fxOrderPayload[tranxTypeName];
      const payload = pick(req.body, params);

      const value = await validation.validateAsync(payload, DEFAULT_OPTIONS);

      const { receiving_bank, customer, beneficiary_details, ...fxDetails } = value;
      const cusKycId = customer.id;
      delete customer.id;

      // Create receiving back
      const recevingBank = await BankDetail.create(receiving_bank, { transaction: t });

      const order = await FxOrder.create(
        {
          ...fxDetails,
          customer,
          beneficiary_details,
          reference_no: Generator.generateToken(),
          current_step_id: user.department.id,
          current_state_id: starter.id,
          receiving_bank_id: recevingBank.id,
          tranx_purpose: fxDetails.tranx_purpose || `${tranxTypeName.toLowerCase()} transaction`,
          bank_charges: fxDetails.bank_charges || 0,
          other_charges: fxDetails.other_charges || 0,
          kyc_status: true,
          user_id: user.id,
          client_approve: 'accepted',
        },
        { transaction: t }
      );

      await t.commit();

      const fxorder = await FxOrder.findOne({
        where: { id: order.id },
        include: [{ model: BankDetail, as: 'receiving_bank' }],
      });

      await fxOrderCreated.topic('save-beneficiary').publish({
        id: cusKycId,
        details: beneficiary_details,
      });

      // Inflow Officer enters order details
      /*
      if (tranxTypeName.toLowerCase() === 'inflow') {
        await fxOrderCreated.add(
          'request-authorization',
          {
            id: cusKycId,
            order: order.id,
          },
          queueOptions
        );
      }
      */

      util.setSuccess(200, 'Fx order created!', new FxOrderResponse(fxorder));
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getFxOrderById(req, res) {
    const { fx_id } = req.params;

    try {
      const options = {
        where: { id: fx_id },
        attributes: {
          exclude: ['business_employment_id', 'spouse_id', 'client_bank_id', 'loan_detail_id'],
          include: [
            [
              sequelize.literal(
                `(SELECT CONCAT(u.fullname, ' (', d.name, ')')  FROM user u 
                INNER JOIN department d ON u.department_id = d.id WHERE FxOrder.user_id = u.id)`
              ),
              'created_by',
            ],
          ],
        },
        include: [
          { model: CurrencyType, as: 'currency_from' },
          { model: CurrencyType, as: 'currency_to' },
          { model: TransactionTypes, as: 'transaction_type' },
          { model: BankDetail, as: 'receiving_bank' },
          { model: FxState, as: 'current_state', attributes: { exclude: ['order'] } },
          {
            model: Department,
            as: 'current_step',
            attributes: { exclude: ['loan_process_order', 'description'] },
          },
          {
            model: FxOrderComment,
            as: 'comments',
            attributes: { exclude: ['fx_order_id', 'user_id', 'updated_at'] },
          },
          {
            model: FxOrderSupportDoc,
            as: 'support_docs',
            attributes: [
              'id',
              'doc_url',
              'description',
              [
                sequelize.literal(`(
                  SELECT CONCAT(user.fullname, ' (', department.name, ')') AS 'upload_by' 
                  FROM user 
                    INNER JOIN department 
                  WHERE 
                    user.department_id = department.id 
                  AND 
                    user.id = support_docs.upload_by_id
              )`),
                'upload_by', // concat column => upload_by: Oyewole Samuel (Loan Officer)
              ],
              'created_at',
            ],
          },
          // { model: PaymentSource, as: 'sources', through: { attributes: [] } },
          {
            model: FxOrderLogs,
            as: 'logs',
            attributes: ['id', 'comment', 'created_at'],
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
          ['comments', 'created_at', 'desc'],
          ['support_docs', 'created_at', 'desc'],
          ['logs', 'created_at', 'desc'],
        ],
      };

      const fxOrder = await FxOrder.findOne(options);
      if (!fxOrder) throw new CustomError(`Fx Order with ID ${fx_id} not found!`, 404);

      util.setSuccess(200, 'successful', new FxOrderResponse(fxOrder));
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async manageFxOrder(req, res) {
    const t = await sequelize.transaction();

    const { user } = req;
    const { fx_id } = req.params;

    try {
      const payload = pick(req.body, ['comment', 'assign_to']);
      const value = await validateManageLoan().validateAsync(payload);

      const loggedInUserDept = user.department;

      const fx = await FxOrder.findOne({
        where: { id: fx_id },
        include: [
          { model: FxState, as: 'current_state' },
          { model: Department, as: 'current_step' },
        ],
      });

      if (!fx) throw new CustomError(`Fx Order with ID ${fx_id} not found!`, 404);
      /*
      if (
        fx.current_step.slug === 'RELATION_OFFICER' &&
        ['REJECTED', 'PENDING'].indexOf(fx.client_approve.toUpperCase()) !== -1
      ) {
        let errorMsg = `Fx Order with Ref No.: ${fx.reference_no} is pending client approval`;
        if (fx.client_approve === 'rejected') {
          errorMsg = `Fx Order with Ref No.: ${fx.reference_no} is rejected by client`;
        }
        throw new CustomError(errorMsg);
      }
*/
      if (fx.current_step.slug === 'AUDIT' && fx.current_state.slug === 'CLOSED')
        throw new Error(
          `Oops, Fx Order with Reference Number ${fx.reference_no} closed and move to Audit Dept`
        );

      const CURRENT_STATE = fx.current_state.id;
      const CURRENT_STAGE = fx.current_step.id;

      if (loggedInUserDept.id !== CURRENT_STAGE) {
        throw new CustomError(
          'You are not authorized to move this order, check your current department',
          401
        );
      }

      let assignedTo = value.assign_to
        ? await User.findOne({
            where: { id: value.assign_to },
            include: [{ model: Department, as: 'department' }],
          })
        : undefined;

      const logger = {};
      const fxUpds = {};

      // test
      const newFxFlow = new FxFlow(fx);
      newFxFlow.loadFlows(fxjson);
      const iterator = await newFxFlow.getIterator();

      if (!iterator.valid()) throw new CustomError('Error 3404: Unknown data attack!');
      const { next_state, next_step } = iterator.next();

      // const { next_state, next_step } = await FxService.fxNextLevel(fx);

      // if (!next_state || !next_step) throw new Error('Error 3404: Unknown data attack!');
      if (next_state.slug === 'CLOSED' && next_step.slug === 'AUDIT') assignedTo = undefined;

      if (assignedTo && assignedTo.department.id !== next_step.id)
        throw new Error(
          `${
            assignedTo.fullname
          } is not in ${next_step.name.toLowerCase()}, please assign to another staff`
        );

      const to_who = assignedTo ? assignedTo.id : null;
      merge(logger, {
        fx_order_id: fx_id,
        from_id: CURRENT_STATE,
        to_id: next_state.id,
        from_who_id: user.id,
        assign_to_id: to_who,
        dept_id: next_step.id,
        comment: value.comment,
        timeline: moment().add(3, 'hours').toDate(),
      });

      merge(fxUpds, {
        current_state_id: next_state.id,
        current_step_id: next_step.id,
      });

      await FxOrderLogs.create({ ...logger }, { transaction: t });
      const updatedFx = await fx.update({ ...fxUpds }, { transaction: t });

      await t.commit();

      // send notification to assign to
      await sendAssignToMailFx.topic('sendAssignFx').publish({ fx: updatedFx });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async updateFxOrder(req, res) {
    const t = await sequelize.transaction();
    const { user } = req;

    const { fx_id } = req.params;
    const i = ['swap', 'refund', 'inflow'];
    const { resent_invoice } = req.body;

    try {
      const fxOrder = await FxService.findOrFail(fx_id);

      let tranxTypeName = fxOrder.transaction_type.name.toLowerCase();
      if (i.indexOf(tranxTypeName) > -1) tranxTypeName = 'inflow';

      const { validation, params } = fxOrderPayload[tranxTypeName];
      const payload = pick(req.body, params);

      const value = await validation.validateAsync(payload, DEFAULT_OPTIONS);
      const { receiving_bank, ...order } = value;

      // update receiving bank
      await BankDetail.update(
        receiving_bank,
        { where: { id: fxOrder.receiving_bank_id } },
        { transaction: t }
      );
      // update fx order
      await FxOrder.update({ ...order }, { where: { id: fxOrder.id }, transaction: t });

      // Update FxOrderComment
      await FxOrderComment.create(
        {
          user_id: user.id,
          fx_order_id: fxOrder.id,
          title: `${user.fullname} (${user.department.name}):`,
          comment: `Edited this order on ${moment().format('dddd, MMMM Do, YYYY HH:mm A')}`,
        },
        { transaction: t }
      );

      await t.commit();

      if (resent_invoice) {
        // DashboardEmitter.emit({
        //   type: 'ReSendInvoiceEmail',
        //   payload: fxOrder,
        // });
      }

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);

      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getLoggedInFxOrders(req, res) {
    // const { user } = req;
    const { page, limit, dept_id } = req.query;

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      // const fxState = await FxService.getFxStateByDept(user.department);

      const whereQry = {};
      // const stateReq = {};

      if (!isUndefined(dept_id) && dept_id !== '') {
        merge(whereQry, { '$current_step.id$': { $eq: parseInt(dept_id) } });
      }

      // if (fxState) {
      //   merge(whereQry, { '$current_state.id$': { $eq: fxState.id } });
      //   merge(stateReq, { required: true });
      // }

      // merge(whereQry, { '$current_step.id$': { $eq: user.department.id } });

      const options = {
        where: whereQry,
        include: [
          { model: TransactionTypes, as: 'transaction_type' },
          {
            model: FxState,
            as: 'current_state',
            required: true,
          },
          { model: CurrencyType, as: 'currency_from' },
          { model: CurrencyType, as: 'currency_to' },
          {
            model: Department,
            as: 'current_step',
            attributes: ['id', 'name', 'slug'],
            required: true,
          },
        ],
        ...pagOptns,
        subQuery: false,
      };

      const loans = await FxOrder.findAndCountAll(options);
      const response = loans.rows.map((data) => new FxOrderResponse(data));

      util.setPagination(new Paginate(loans, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', response);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * Issue #23
   * Upload supporting documents to order
   */
  static async uploadSupportDoc(req, res) {
    try {
      const { user, file } = req;
      const { fx_id } = req.params;

      const payload = pick(req.body, ['description']);
      await validateSupportDoc().validateAsync(payload);

      const fx = await FxService.findOrFail(fx_id);

      const uploader = new UploadService();
      const response = await uploader.uploadFile(null, file, null);

      // create records
      const supportDoc = await FxOrderSupportDoc.create({
        fx_order_id: fx.id,
        description: payload.description,
        doc_url: response.message,
        upload_by_id: user.id,
      });

      util.setSuccess(200, 'Upload successful', supportDoc);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * POST
   * Add comment to Fx Order Comment
   */
  static async addFxOrderComment(req, res) {
    const { user } = req;
    const { fx_id } = req.params;

    try {
      const payload = pick(req.body, ['comment']);
      await validateManageLoan().validateAsync(payload);

      const order = await FxOrder.findOne({
        where: { id: fx_id },
        include: [{ model: FxState, as: 'current_state', attributes: { exclude: ['order'] } }],
      });

      if (!order) throw new CustomError(`Fx Order with ID ${fx_id} not found!`, 404);

      // if (order.current_state && order.current_state.name === 'CLOSED')
      //   throw new Error(`Oops! Order with Reference ID ${order.reference_no} CLOSED`);

      // @TODO: order.addComments(value.comment, user.id);
      await FxOrderComment.create({
        user_id: user.id,
        fx_order_id: order.id,
        title: `${user.fullname} (${user.department.name}) comment: `,
        comment: payload.comment,
      });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * DELETE
   * Delete comment
   */
  static async deleteFxOrderComment(req, res) {
    const { user } = req;
    const { fx_id, comment_id } = req.params;

    try {
      if (fx_id === '' || comment_id === '') {
        throw new CustomError(`Validation error, please provide fx order ID and comment ID!`, 404);
      }

      const comment = await FxOrderComment.findOne({
        where: {
          $and: [{ id: comment_id }, { fx_order_id: fx_id }],
        },
      });

      if (!comment) throw new CustomError(`Comment not found, kindly,refresh and try again!`);

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

  static async removeUploadDoc(req, res) {
    const { user } = req;
    const { fx_id, doc_id } = req.params;

    try {
      if (fx_id === '' || doc_id === '') {
        throw new CustomError(`Validation error, please provide fx order ID and doc ID!`);
      }

      const doc = await FxOrderSupportDoc.findOne({
        where: {
          $and: [{ id: doc_id }, { fx_order_id: fx_id }],
        },
      });

      if (!doc) throw new CustomError(`Support doc not found, kindly,refresh and try again!`, 404);

      if (doc.upload_by_id !== user.id)
        throw new CustomError(`Oops, you don't have permission to delete this file!`, 404);

      await doc.destroy();

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Get Fx Transaction types
   * @param {*} req @Request
   * @param {*} res @Response
   */
  static async getTransactionTypes(req, res) {
    try {
      const transaction_types = await TransactionTypes.findAll();

      util.setSuccess(200, 'successful', transaction_types);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Issue #24
   * [INFLOW-FEATURES] Delete orders
   * Only by someone in the current department that the order is in
   */
  static async deleteFxOrderById(req, res) {
    const { user } = req;
    const { fx_id } = req.params;

    try {
      const loggedInUserDept = user.department;

      const fx = await FxOrder.findOne({
        where: { id: fx_id },
        include: [
          { model: FxState, as: 'current_state' },
          { model: Department, as: 'current_step' },
        ],
      });

      if (!fx) throw new CustomError(`Fx Order with ID ${fx_id} not found!`, 404);

      if (fx.current_step.slug === 'AUDIT' && fx.current_state.slug === 'CLOSED')
        throw new Error(`Oops, Fx Order with Reference Number ${fx.reference_no} closed`);

      // delete/restore

      const CURRENT_STAGE = fx.current_step.id;

      if (loggedInUserDept.id !== CURRENT_STAGE) {
        throw new CustomError('You are not authorized to delete this order', 401);
      }

      await fx.destroy();

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * Export FX orders to CSV
   * [https://gitlab.com/cpg_cicd/issue-tracker/-/issues/30]
   */
  static async exportFxOrdersToCSV(req, res) {
    const { user } = req;
    const { date_range, transaction_type_id } = req.query;

    const reportDetails = { title: `Fx Orders Report Ready - ${moment().format('YYYY-MM-DD')}` };

    try {
      const whereQry = {};

      if (!isUndefined(date_range) && date_range !== '') {
        let [start_date, end_date] = date_range.split('|');

        const schema = validateExportDate();
        await schema.validateAsync({ start_date, end_date, transaction_type_id });

        Object.assign(reportDetails, {
          title: `Fx Orders Report for ${start_date} - ${end_date}`,
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

      const trxQry = {};

      if (!isUndefined(transaction_type_id) && transaction_type_id !== '') {
        merge(whereQry, { '$transaction_type.id$': { $eq: transaction_type_id } });
        merge(trxQry, { required: true });
      }

      const options = {
        where: whereQry,
        attributes: {
          exclude: ['currency_type_id', 'current_state_id', 'current_step_id'],
        },
        include: [
          { model: CurrencyType, as: 'currency_from' },
          { model: CurrencyType, as: 'currency_to' },
          { model: TransactionTypes, as: 'transaction_type', ...trxQry },
          { model: FxState, as: 'current_state', attributes: { exclude: ['order'] } },
          {
            model: Department,
            as: 'current_step',
            attributes: { exclude: ['loan_process_order', 'description'] },
          },
          {
            model: FxOrderLogs,
            as: 'logs',
            attributes: ['created_at'],
          },
        ],
        order: [
          ['created_at', 'DESC'],
          ['logs', 'created_at', 'DESC'],
        ],
        subQuery: false,
      };

      const fx_orders = await FxOrder.findAndCountAll(options);
      const response = fx_orders.rows.map((data) => new FxOrderResponse(data));

      await exportFileToCsv.topic('exportFileToCsv').publish({
        response: JSON.stringify(response),
        user,
        reportDetails,
      });

      // await exportFileToCsv.add(
      //   'exportFileToCsv',
      //   { response: JSON.stringify(response), user, reportDetails },
      //   {
      //     attempts: 3,
      //     backoff: {
      //       type: 'exponential',
      //       delay: 5000,
      //     },
      //   }
      // );

      // DashboardEmitter.emit({
      //   type: 'ExportFileToCsvMail',
      //   payload: { response: Buffer.from(JSON.stringify(response)), user, reportDetails },
      // });

      util.setSuccess(200, 'Request processed, Report will be send to your email shortly!', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async fetchCustomerBank(req, res) {
    const { customer_kyc_id } = req.params;

    try {
      const response = await FxBeneficiary.findAll({ where: { customer_kyc_id } });

      util.setSuccess(200, 'successful', response);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Fx Order Customer aggregator
   */
  static async aggregateFxOrder(req, res) {
    const { phone } = qs.parse(req.query);

    try {
      // const currentPage = parseInt(page) || 1;
      // const defaultLimit = parseInt(limit) || 20;
      // const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

      const ph = !isUndefined(phone) && phone !== '' ? phone.replace(/[^0-9]/g, '') : undefined;

      const options = {
        // limit: defaultLimit,
        // offset: defaultLimit * (currentPage - 1),
        order: [[sequelize.fn('count', sequelize.col('id')), 'DESC']],
        attributes: ['customer', [sequelize.fn('count', sequelize.col('id')), 'total_orders']],
        group: ['customer'],
        raw: true,
      };

      if (ph) {
        options.where = { 'customer.phone_number': { $like: `%${ph}%` } };
      }

      let orders = await FxOrder.findAll(options);
      orders = orders.map((o) => {
        return { ...o.customer, total_orders: o.total_orders };
      });

      util.setSuccess(200, 'successful', orders);
      return util.send(res);
    } catch (e) {
      return util.setError(e.statusCode || 400, e.message).send(res);
    }
  }

  static async getFxCustomerData(req, res) {
    let { phone } = req.params;
    try {
      phone = phone.trim().replace(/[^0-9]/g, '');
      if (isUndefined(phone) || phone === null || phone === '') {
        throw new CustomError('Please provide customer phone number');
      }

      // get related ids
      const customer = await sequelize.query(
        `
        SELECT customer FROM fx_orders
        WHERE JSON_SEARCH(customer, 'all', '${phone}')
        IS NOT NULL LIMIT 1
      `,
        { type: QueryTypes.SELECT }
      );

      const options = {
        where: { 'customer.phone_number': { $eq: phone } },
        attributes: [
          'id',
          'reference_no',
          'volume',
          'exchange_rate',
          'total_payment',
          'bank_charges',
          'other_charges',
          'tranx_purpose',
          [
            sequelize.literal(`(
            SELECT
            CASE 
              WHEN slug IN ('PROCESSING', 'CLOSED') THEN 'Completed'
              ELSE 'In Progress'
            END AS status
            FROM fx_states
            WHERE current_state_id = fx_states.id
          )`),
            'status',
          ],
          [
            sequelize.literal(`(
            SELECT name 
            FROM transaction_types 
            WHERE transaction_type_id = transaction_types.id
          )`),
            'transaction_type',
          ],
          [
            sequelize.literal(`(
            SELECT locale 
            FROM currency_types 
            WHERE currency_from_id = currency_types.id
          )`),
            'currency_from',
          ],
          [
            sequelize.literal(`(
            SELECT locale 
            FROM currency_types 
            WHERE currency_to_id = currency_types.id
          )`),
            'currency_to',
          ],
          'created_at',
        ],
        order: [['created_at', 'DESC']],
      };

      const orders = await FxOrder.findAll(options);

      util.setSuccess(200, 'successful', { ...customer[0].customer, orders });
      return util.send(res);
    } catch (e) {
      return util.setError(e.statusCode || 400, e.message).send(res);
    }
  }
}

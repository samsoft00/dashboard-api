import { pick } from 'lodash';
import Joi, { ValidationError } from '@hapi/joi';
import RespUtil from '../utils/RespUtil';
import { Bank, ClientBank } from '../database/models';
import Utility from '../utils/Utility';
import CustomError from '../utils/CustomError';
import ErrorHandler from '../errors/error.handler';

const util = new RespUtil();
const schema = Joi.object().keys({
  bank_id: Joi.number().required().error(new ValidationError('Please select a valid bank name!')),
  account_number: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required()
    .error(new ValidationError('Invalid account number, number must be 10 digits!')),
  account_name: Joi.string().required().error(new ValidationError('Please enter account name!')),
});

// const LOAN_BANK_ERR = 'Bank detail not found!';
const LOAN_BANK_DETAIL = ['bank_id', 'account_number', 'account_name'];
const { activityLog } = Utility;

/**
 * Loan Bank Controller
 */
export default class LoanBankController {
  static async getBankDetail(req, res) {
    const { applicant_id, id } = req.params;

    try {
      const bankDetail = await ClientBank.findOne({
        where: { id, applicant_id },
        include: [{ model: Bank, as: 'bank' }],
      });
      if (!bankDetail) throw new CustomError('Client Bank detail not found!');

      util.setSuccess(200, 'successful', bankDetail);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async createBankDetail(req, res) {
    const { applicant_id } = req.params;
    const payload = pick(req.body, LOAN_BANK_DETAIL);

    try {
      await schema.validateAsync(payload);

      const bank_details = await ClientBank.create({ ...payload, applicant_id });
      activityLog(req.headers['x-real-ip'], req.user, 'CREATE_BANK_DETAIL', {
        bank_detail_id: bank_details.id,
      });

      util.setSuccess(200, 'successful', bank_details);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateBankDetail(req, res) {
    const { applicant_id, id } = req.params;
    const payload = pick(req.body, LOAN_BANK_DETAIL);

    try {
      await schema.validateAsync(payload);

      const bank_details = await ClientBank.findOrFail({ id, applicant_id });
      await bank_details.update({ ...payload, applicant_id });

      const r = await bank_details.reload();

      activityLog(req.headers['x-real-ip'], req.user, 'UPDATE_BANK_DETAIL', {
        bank_detail_id: id,
      });

      util.setSuccess(200, 'successful', r);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async deleteBankDetail(req, res) {
    const { applicant_id, id } = req.params;

    try {
      const bank_details = await ClientBank.findOrFail({ id, applicant_id });
      await bank_details.destroy();

      activityLog(req.headers['x-real-ip'], req.user, 'DELETE_BANK_DETAIL', { bank_detail_id: id });

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
}

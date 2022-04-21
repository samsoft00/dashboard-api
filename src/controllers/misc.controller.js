import {
  LoanType,
  BusinessEmploymentType,
  LoanState,
  Occupation,
  IdentityType,
  CheckList,
  CurrencyType,
  LoanSource,
  Bank,
} from '../database/models';
import RespUtil from '../utils/RespUtil';

const util = new RespUtil();

export default class MiscController {
  // Get loan type
  static async getLoanType(req, res) {
    try {
      const loanType = await LoanType.findAll();

      util.setSuccess(200, 'successful', loanType);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // Get loan States
  static async getLoanStates(req, res) {
    try {
      const loanState = await LoanState.findAll({ attributes: ['id', 'name'] });

      util.setSuccess(200, 'successful', loanState);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // Get occupations
  static async getOccupation(req, res) {
    try {
      const occupatn = await Occupation.findAll();

      util.setSuccess(200, 'successful', occupatn);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // Get Identity
  static async getIdentity(req, res) {
    try {
      const identity = await IdentityType.findAll();

      util.setSuccess(200, 'successful', identity);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // Get employment Type
  static async getEmploymentType(req, res) {
    try {
      const types = await BusinessEmploymentType.findAll();

      util.setSuccess(200, 'successful', types);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  // Get bank
  static async getBankList(req, res) {
    try {
      const bank = await Bank.findAll();

      util.setSuccess(200, 'successful', bank);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async getChecklist(req, res) {
    try {
      const checkLists = await CheckList.findAll();
      /*
      const grpCheckList = checkLists.reduce((r, a) => {
        r[a.title] = r[a.title] || [];
        r[a.title].push({ id: a.id, name: a.name });
        return r;
      }, Object.create(null));
*/

      util.setSuccess(200, 'successful', checkLists);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  static async getCurrencyType(req, res) {
    try {
      const currencies = await CurrencyType.findAll();

      util.setSuccess(200, 'successful', currencies);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }

  /**
   * Get Loan Sources
   */
  static async getLoanSources(req, res) {
    try {
      const sources = await LoanSource.findAll();

      util.setSuccess(200, 'successful', sources);
      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}

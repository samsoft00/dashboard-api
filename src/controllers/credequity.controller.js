/* eslint-disable radix */
import qs from 'qs';
import { User, CredequityLogs } from '../database/models';

import Utility from '../utils/Utility';
import RespUtil from '../utils/RespUtil';
import Paginate from '../utils/Pagination';

const util = new RespUtil();
const { newPagHandler } = Utility;
/**
 * Credequity Controller
 * ID Check MIDI
 * Credit Check Pro2
 */
export default class CredequityController {
  static async checkMidi(req, res) {
    const { result } = req;
    util.setSuccess(200, 'successful', result);

    return util.send(res);
  }

  static async creditCheckPro(req, res) {
    const { result } = req;
    util.setSuccess(200, 'successful', result);

    return util.send(res);
  }

  static async getRequestReport(req, res) {
    const { page, limit } = qs.parse(req.query);

    const currentPage = parseInt(page) || 1;
    const defaultLimit = parseInt(limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      const options = {
        attributes: {
          exclude: ['user_id'],
        },
        include: [{ model: User, as: 'user', attributes: ['id', 'fullname', 'email'] }],
        ...pagOptns,
        subQuery: false,
      };

      const fx_orders = await CredequityLogs.findAndCountAll(options);

      util.setPagination(new Paginate(fx_orders, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', fx_orders.rows);

      return util.send(res);
    } catch (error) {
      return util.setError(error.statusCode || 400, error.message).send(res);
    }
  }
}

import { pick } from 'lodash';
import axios from 'axios';
import config from 'config';
import FxService from '../services/fx.service';

import ResUtil from '../utils/RespUtil';
import CustomError from '../utils/CustomError';

axios.defaults.headers.post['Content-Type'] = 'application/json';
const CUSTOMER_API = config.get('api.customer_api');
const util = new ResUtil();

const { request, getCustomerData } = FxService;

/**
 * Fetch Customer middleware
 */

export default async (req, res, next) => {
  const { customer_id } = pick(req.body, ['customer_id']);

  try {
    if (!customer_id) throw new CustomError(`Error, Please select customer name`);

    const api_url = `${CUSTOMER_API}/${customer_id}`;
    const response = await request(null, api_url, 'GET', {});

    const customer = getCustomerData(response.data);

    Object.assign(req.body, { customer });
    return next();
  } catch ({ message }) {
    return util.setError(400, message).send(res);
  }
};

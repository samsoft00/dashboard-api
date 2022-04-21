import config from 'config';
import { pick } from 'lodash';
import { Queue } from 'bullmq';
import ResUtil from '../utils/RespUtil';
import Utility from '../utils/Utility';
import { CredequityError } from '../utils/CustomError';
import AxiosRequest from '../utils/AxiosRequest';
import { QueueService } from '../services/queue.service';

const Joi = require('@hapi/joi').extend(require('@hapi/joi-date'));

const { credit_check_api, midi_api, bearer_token } = config.get('credequity');
const credequityLog = new QueueService('credequity-log');

const ID_MIDI = ['phone'];
const CHECK_CREDIT_PRO = ['name', 'phone'];

const util = new ResUtil();
const { replaceAll } = Utility;

export default async (req, res, next) => {
  const { user } = req;
  const splitpath = req.url.split('/');
  const pathname = splitpath[splitpath.length - 1];

  let validObj;
  let req_api;
  let validateReq;

  try {
    switch (pathname) {
      case 'credit_check':
        validObj = CHECK_CREDIT_PRO;
        req_api = credit_check_api;
        validateReq = Joi.object().keys({
          name: Joi.string().required().error(new Error('Customer name is required')),
          phone: Joi.string()
            .pattern(/^[0-9]+$/)
            .required()
            .error(new Error('Phone number is complulsory')),
        });
        break;

      case 'check_midi':
        validObj = ID_MIDI;
        req_api = midi_api;
        validateReq = Joi.object().keys({
          phone: Joi.string()
            .pattern(/^[0-9]+$/)
            .required()
            .error(new Error('Phone number is complulsory')),
        });
        break;

      default:
        return next();
    }

    const payload = pick(req.body, validObj);

    const { error, value } = validateReq.validate(payload);
    if (error) throw new Error(error.message);

    const api = replaceAll(req_api, value);
    const response = await AxiosRequest(`Bearer ${bearer_token}`, api, 'POST', {}, CredequityError);

    const { message } = response.data;
    const { data } = message;

    await credequityLog.topic('credequityLog').publish({
      user,
      api_url: api,
      req_status: true,
      req_payload: value,
      data,
    });

    Object.assign(req, { result: data });

    return next();
  } catch (error) {
    return util.setError(400, error.message).send(res);
  }
};

import moment from 'moment';
import phoneUtil from 'google-libphonenumber';

import CustomError from '../utils/CustomError';
import { QueueService } from '../services/queue.service';

const phoneUtilInstance = phoneUtil.PhoneNumberUtil.getInstance();
const { E164 } = phoneUtil.PhoneNumberFormat;

const logActivity = new QueueService('process-activity');

export default class Utility {
  static pagHandler(page, pageSize, orderBy = 'id') {
    return {
      page,
      paginate: pageSize,
      order: [[orderBy, 'DESC']],
    };
  }

  static newPagHandler(page, pageSize, orderBy = 'id') {
    return {
      order: [[orderBy, 'DESC']],
      limit: pageSize,
      offset: pageSize * (page - 1),
    };
  }

  static replaceAll(str, mapObj) {
    const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');

    return str.replace(re, (matched) => {
      return mapObj[matched.toLowerCase()];
    });
  }

  static getTotalProcessTime(startTime, endTime) {
    const ms = moment(startTime).diff(moment(endTime));
    const d = moment.duration(ms);

    return `${Math.floor(d.asHours()).toString().padStart(2, '0')}:${moment
      .utc(ms)
      .format('mm:ss')}`;
  }

  static activityLog(ip, user, action, data) {
    logActivity.topic('log-activity').publish({ ip, user, action, data });
  }

  static isValidHttpUrl(string) {
    let url;

    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  // format phone number
  static formatPhoneNumber(phone) {
    const number = phoneUtilInstance.parseAndKeepRawInput(phone, 'NG');

    const check = phoneUtilInstance.isValidNumberForRegion(number, 'NG');
    if (!check) throw new CustomError('Invalid phone number, check and try again!');

    return phoneUtilInstance.format(number, E164);
  }
}

/**
 *   limit: 12 ==> paginate, offset: 12 ==> paginate * (page - 1)
 */

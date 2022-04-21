const { default: ErrorLog } = require('../../errors/bugsnag');
const { CredequityLogs } = require('../../database/models');

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { user, api_url, req_status, req_payload, data } = job.data;

  try {
    await CredequityLogs.create({
      user_id: user.id,
      api_url,
      req_status,
      req_payload,
      res_payload: data,
    });
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

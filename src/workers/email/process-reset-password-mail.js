const { v4 } = require('uuid');
const config = require('config');
const { PubSub } = require('@google-cloud/pubsub');
const { default: ErrorLog } = require('../../errors/bugsnag');
const { User } = require('../../database/models');

const frontend_login_url = config.get('general.fontendUrl');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const payload = job.data;

  try {
    const reset_token = v4();
    const reset_expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const { email, fullname } = payload;

    await User.update({ reset_token, reset_expires }, { where: { id: payload.id } });

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'PasswordReset',
        frontend_login_url,
        reset_token,
        email,
        fullname,
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

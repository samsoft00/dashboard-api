const config = require('config');
const { PubSub } = require('@google-cloud/pubsub');

// const frontend_login_url = config.get('general.fontendUrl');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { user, password } = job.data;

  const dataBuffer = Buffer.from(
    JSON.stringify({
      email_type: 'LoginEmail',
      fullUrl: 'http://dashboard.cpfs.online',
      password,
      user,
    })
  );

  await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);

  return Promise.resolve();
};

const config = require('config');
const { PubSub } = require('@google-cloud/pubsub');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { download_link, user, report_date } = job.data;

  const dataBuffer = Buffer.from(
    JSON.stringify({
      email_type: 'SendBdcReportMail',
      download_link,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      report_date,
    })
  );

  await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  return Promise.resolve();
};

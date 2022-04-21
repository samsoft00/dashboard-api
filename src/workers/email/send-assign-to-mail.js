const moment = require('moment');
const config = require('config');
const { PubSub } = require('@google-cloud/pubsub');
const { default: ErrorLog } = require('../../errors/bugsnag');
const { User, LoanLogs, LoanApplication } = require('../../database/models');

const frontend_login_url = config.get('general.fontendUrl');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { loan } = job.data;

  try {
    const { logs } = await LoanApplication.findOne({
      where: { id: loan.id },
      include: [
        {
          model: LoanLogs,
          as: 'logs',
          include: [
            { model: User, as: 'from_who', attributes: ['id', 'fullname', 'username', 'email'] },
            { model: User, as: 'assign_to', attributes: ['id', 'fullname', 'username', 'email'] },
            'from',
            'to',
            'desk',
          ],
        },
      ],
      order: [['logs', 'created_at', 'DESC']],
    });

    const { from_who, assign_to } = logs[logs.length - 1];

    if (!assign_to) return;

    const { email, fullname } = assign_to;
    const { name, refrence_no, created_at } = loan;

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'SendAssignToMail',
        fullname,
        frontend_login_url,
        from_who: from_who.fullname,
        refrence_no,
        name,
        to: email,
        created_at: moment(created_at).format('DD-MM-YYYY'),
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

const moment = require('moment');
const config = require('config');
const { PubSub } = require('@google-cloud/pubsub');
const { default: ErrorLog } = require('../../errors/bugsnag');
const { User, FxOrderLogs, FxOrder } = require('../../database/models');

const frontend_login_url = config.get('general.fontendUrl');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { fx } = job.data;

  try {
    const { logs } = await FxOrder.findOne({
      where: { id: fx.id },
      include: [
        {
          model: FxOrderLogs,
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
    });

    const { from_who, assign_to } = logs[logs.length - 1];

    if (!assign_to) return;

    const { email, fullname } = assign_to;
    const { order_no, created_at } = fx;

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'SendAssignToMailFx',
        fullname,
        frontend_login_url,
        from_who: from_who.fullname,
        refrence_no: order_no,
        name: fx.customer.name,
        email,
        created_at: moment(created_at).format('DD-MM-YYYY'),
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

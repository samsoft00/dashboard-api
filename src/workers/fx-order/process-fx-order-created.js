const moment = require('moment');
const Bugsnag = require('@bugsnag/js');
const { PubSub } = require('@google-cloud/pubsub');
const jwt = require('jsonwebtoken');
const config = require('config');

const { default: FileService } = require('../../services/file.service');
const { CurrencyType, FxBeneficiary, FxOrder } = require('../../database/models');

const EMAIL_TOPIC = config.get('gcp.email_broadcast_topic');
const pubSubClient = new PubSub({ keyFilename: process.env.GQUEUE_KEYFILE });

Bugsnag.start({ apiKey: config.get('general.bugsnag'), appType: 'worker' });
const authorizeBaseUrl = 'https://client.sebastianbdc.com/authorize';

/**
 * Save Beneficiary Details
 */
const saveBeneficiary = async (data) => {
  const { id: customer_kyc_id, details } = data;

  try {
    const promise = [];

    details.forEach((detail) =>
      promise.push(
        FxBeneficiary.findOrCreate({
          where: { customer_kyc_id, account_number: detail.account_number },
          defaults: { ...detail, customer_kyc_id },
        })
      )
    );

    await Promise.all(promise);
  } catch (e) {
    Bugsnag.notify(e);
  }

  return Promise.resolve();
};

/**
 * Request Client Authentication
 */
const requestClientAuthorization = async (data) => {
  try {
    const fx = await FxOrder.findOne({
      where: { id: data.order },
      include: [
        { model: CurrencyType, as: 'currency_from' },
        { model: CurrencyType, as: 'currency_to' },
      ],
    });

    if (!fx) throw new Error(`Fx Order ${data.order} not found`);

    const volume = new Intl.NumberFormat('en-US').format(fx.volume);
    const CREATED_DATE = moment(fx.created_at).format('dddd, MMMM Do, YYYY');
    const invoice = new FileService({
      rate: 'As agreed',
      volume,
      customer: fx.customer,
      created_date: CREATED_DATE,
      due_date: CREATED_DATE,
      reference_no: fx.reference_no,
      generated_date: moment().format('dddd, MMMM Do, YYYY HH:mm'),
      service_description: `Exchange ${volume} of ${fx.currency_from.locale} to ${fx.currency_to.locale}`,
    });
    const file = await invoice.generateClientApproval();

    const link = jwt.sign(
      {
        id: fx.id,
        reference_no: fx.reference_no,
        customer_kyc_id: data.id,
        file_url: file.file_url,
      },
      config.get('auth.secret'),
      { expiresIn: '3h' }
    );

    Object.assign(fx, { authorize_token: link, authorize_file_url: file.file_url });
    await fx.save({ fields: ['authorize_token', 'authorize_file_url'] });

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'ClientAuthorizedEmail',
        customer: fx.customer,
        title: `Action Reqiured - FX Order #${fx.reference_no}`,
        link: `${authorizeBaseUrl}/${link}`,
        file: { filename: file.filename, path: file.file_url },
      })
    );

    await pubSubClient.topic(EMAIL_TOPIC).publish(dataBuffer);
  } catch (e) {
    Bugsnag.notify(e);
  }

  return Promise.resolve();
};

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { name } = job;

  switch (name) {
    case 'save-beneficiary':
      await saveBeneficiary(job.data);
      break;

    case 'request-authorization':
      await requestClientAuthorization(job.data);
      break;

    default:
      Bugsnag.notify(new Error(`${name} not implemented`));
      break;
  }
};

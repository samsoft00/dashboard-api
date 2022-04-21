const moment = require('moment');
const config = require('config');
const cf = require('currency-formatter');
const { PubSub } = require('@google-cloud/pubsub');
const { default: ErrorLog } = require('../../errors/bugsnag');
const { default: FileService } = require('../../services/file.service');
const { TransactionTypes, FxOrder, CurrencyType, BankDetail } = require('../../database/models');

const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { id } = job.data;

  try {
    const options = {
      where: { id },
      include: [
        { model: CurrencyType, as: 'currency_from' },
        { model: CurrencyType, as: 'currency_to' },
        { model: TransactionTypes, as: 'transaction_type' },
        { model: BankDetail, as: 'receiving_bank' },
      ],
    };

    const fxOrder = await FxOrder.findOne(options);

    const { customer, receiving_bank, currency_from, currency_to } = fxOrder.toJSON();
    //   const { email, name } = customer;
    const invoice_no = fxOrder.reference_no;

    const CREATED_DATE = moment(fxOrder.created_at).format('dddd, MMMM Do, YYYY');

    const payload = {
      invoice_date: CREATED_DATE,
      invoice_due: CREATED_DATE,
      invoice_no,
      generated_date: moment().format('dddd, MMMM Do, YYYY HH:mm A'),
      rate: cf.format(fxOrder.exchange_rate, { code: currency_to.locale }),
      volume: fxOrder.volume, // cf.format(fxOrder.volume, { code: currency.locale }),
      sub_total: cf.format(fxOrder.total_payment - (fxOrder.bank_charges + fxOrder.other_charges), {
        code: currency_to.locale,
      }),
      transfer_charge: cf.format(fxOrder.bank_charges, { code: currency_to.locale }), // NGN
      other_charges: cf.format(fxOrder.other_charges, { code: currency_to.locale }),
      total: cf.format(fxOrder.total_payment, { code: currency_to.locale }), // NGN
      currency_name: currency_from.name,
      customer,
      receiving_bank,
      service_description: `Exchange ${fxOrder.volume} ${currency_from.name} to ${currency_to.name}`,
    };

    const invoice = new FileService(payload);
    const file = await invoice.generateInvoice();

    fxOrder.invoice_url_path = file.file_url;
    await fxOrder.save({ fields: ['invoice_url_path'] });

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'InvoiceEmail',
        customer,
        title: `Fx Order Invoice - #${invoice_no}`,
        generated_date: moment().format('dddd, MMMM Do, YYYY HH:mm'),
        amount_in_naira: payload.volume,
        current_rate: payload.rate,
        file_url: file.file_path,
        invoice_no,
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

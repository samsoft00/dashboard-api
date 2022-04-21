const config = require('config');
const slugify = require('slugify');
const { stringify } = require('csv');
const { promisify } = require('util');
const moment = require('moment');
const { PubSub } = require('@google-cloud/pubsub');
const { default: ErrorLog } = require('../../errors/bugsnag');
const UploadService = require('../../services/upload.service').default;

const { email_broadcast_topic } = config.get('gcp');
const stringifyPromise = promisify(stringify);
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

const getTotalProcessTime = (startTime, endTime) => {
  const ms = moment(startTime).diff(moment(endTime));
  const d = moment.duration(ms);

  return `${Math.floor(d.asHours()).toString().padStart(2, '0')}:${moment.utc(ms).format('mm:ss')}`;
};

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { response, user, reportDetails } = job.data;

  const orders = JSON.parse(response.toString());
  try {
    const resolveOrder = () => {
      return orders.map((payload) => {
        // eslint-disable-next-line no-param-reassign
        delete payload.id;

        const {
          priority,
          payment_source,
          beneficiary_details,
          transaction_type,
          customer,
          currency_from,
          currency_to,
          current_state,
          current_step,
          created_at,
          updated_at,
          invoice_url_path,
          deletedAt,
          volume,
          exchange_rate,
          total_payment,
          bank_charges,
          other_charges,
          kyc_status,
          logs,
          ...others
        } = payload;

        let source = '';
        // eslint-disable-next-line no-restricted-syntax
        for (const payment of payment_source) {
          source += `${payment.paying_bank}\n${new Intl.NumberFormat().format(payment.amount)}\r\n`;
        }

        let details = '';
        // eslint-disable-next-line no-restricted-syntax
        for (const beneficiary of beneficiary_details) {
          const {
            bank_name,
            account_number,
            account_name,
            iban_number,
            routing_number,
            swift_code,
            branch_sort_code,
          } = beneficiary;
          details += `${bank_name}\n${account_number}\n${account_name}\n`;
          if (iban_number !== '') {
            details += `${iban_number}\n`;
          } else if (routing_number !== '') {
            details += `${iban_number}\n`;
          } else if (swift_code !== '') {
            details += `${swift_code}\n`;
          } else if (branch_sort_code !== '') {
            details += `${branch_sort_code}\r\n`;
          }
        }

        /**
         * Get Customer Details
         */
        let customer_details = `${customer.name}\n${customer.address}\n`;
        if (customer.email) {
          customer_details += `${customer.email}\n`;
        } else if (customer.phone_number) {
          customer_details += `${customer.phone_number}`;
        }

        return {
          ...others,
          volume: new Intl.NumberFormat().format(volume),
          bank_charges: new Intl.NumberFormat().format(bank_charges),
          other_charges: new Intl.NumberFormat().format(other_charges),
          total_payment: new Intl.NumberFormat().format(total_payment),
          exchange_rate: new Intl.NumberFormat().format(exchange_rate),
          transaction_type: transaction_type.name,
          customer: customer_details,
          currency_from: currency_from.locale,
          currency_to: currency_to.locale,
          current_state: current_state.name === 'Closed' ? 'Completed' : 'Processing',
          current_step: current_step.name,
          payment_source: source,
          kyc_status: kyc_status === true ? 'Confirmed' : 'Unconfirmed',
          beneficiary_details: details,
          created_at: moment(created_at).format('YYYY-MM-DD'),
          total_time:
            logs.length > 0
              ? getTotalProcessTime(logs[0].created_at, logs[logs.length - 1].created_at)
              : '00:00:00',
          updated_at: moment(updated_at).format('YYYY-MM-DD'),
        };
      });
    };

    const payload = await stringifyPromise(resolveOrder(), {
      header: true,
      columns: [
        { key: 'reference_no', header: 'Reference No' },
        { key: 'volume', header: 'Volume' },
        { key: 'exchange_rate', header: 'Exchange Rate' },
        { key: 'bank_charges', header: 'Bank charges' },
        { key: 'other_charges', header: 'Other charges' },
        { key: 'total_payment', header: 'Total Payment' },
        { key: 'tranx_purpose', header: 'Tranx Purpose' },
        { key: 'transaction_type', header: 'Transaction Type' },
        { key: 'customer', header: 'Customer Name' },
        { key: 'payment_source', header: 'Payment Source' },
        { key: 'beneficiary_details', header: 'Beneficiary Details' },
        { key: 'kyc_status', header: 'KYC Status' },
        { key: 'currency_from', header: 'Currency From' },
        { key: 'currency_to', header: 'Currency To' },
        { key: 'current_step', header: 'Current Dept' },
        { key: 'current_state', header: 'Status' },
        { key: 'total_time', header: 'Current/Total time\r\n(hh:mm:ss)' },
        { key: 'created_at', header: 'Created Date' },
        { key: 'updated_at', header: 'Last Updated Date' },
      ],
    });

    const fileBuffer = Buffer.from(payload);

    const file = {
      buffer: fileBuffer,
      size: fileBuffer.byteLength,
      originalname: `${slugify(reportDetails.title)}.csv`,
    };

    const uploader = new UploadService();
    const upload = await uploader.uploadFile(null, file, null);

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'ExportFileToCsv',
        title: reportDetails.title,
        file_path: upload.message,
        file_name: file.originalname,
        user,
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
    //   MailService.sendEmail(user.email, html, reportDetails.title, true, file);
  } catch (e) {
    ErrorLog(e);
  }

  return Promise.resolve();
};

const { Readable, Transform, pipeline, PassThrough } = require('stream');
const Bugsnag = require('@bugsnag/js');
const cf = require('currency-formatter');
const slugify = require('slugify');
const { PubSub } = require('@google-cloud/pubsub');
const config = require('config');
const moment = require('moment');
const { stringify } = require('csv');
const { promisify } = require('util');
const {
  sequelize,
  LoanApplication,
  BusinessEmploymentType,
  BusinessEmployment,
  Applicants,
  LoanState,
  Department,
  LoanType,
  LoanSource,
  ClientBank,
} = require('../../database/models');
const UploadService = require('../../services/upload.service').default;

const asyncPipeline = promisify(pipeline);
const { email_broadcast_topic } = config.get('gcp');
const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

let totalDisbursed = 0;
let pendingDisbursed = 0;
let loanSource;

// Tranform data
const transformData = (payload) => {
  const {
    amount,
    monthly_repayment_amount,
    applicant,
    client_bank,
    business_employment,
    current_state,
    current_step,
    loan_type,
    loan_source,
    created_at,
  } = payload;

  let state;
  loanSource = loan_source.name;
  if (['DISBURSEMENT', 'CLOSED'].includes(current_state.slug)) {
    state = 'Disbursed';
    totalDisbursed += amount;
  } else if (current_state.slug === 'REJECTED') {
    state = 'Rejected';
  } else {
    state = 'Processing';
    pendingDisbursed += amount;
  }

  const b = client_bank.toJSON();

  return {
    refrence_no: payload.refrence_no,
    name: `${applicant.title} ${applicant.name}`,
    phone_number: applicant.phone_number,
    business_employment: `${business_employment.business_name} (${business_employment.business_employment_type.name})`,
    bank: `${b.bank_name} (${b.account_number})`,
    amount: cf.format(amount, { code: 'NGN' }),
    purpose: payload.purpose,
    monthly_repayment_amount: cf.format(monthly_repayment_amount, { code: 'NGN' }),
    repayment_frequency: payload.repayment_frequency,
    maturity_tenor: payload.maturity_tenor,
    collateral_offered: payload.collateral_offered,
    repeat_loan: payload.repeat_loan ? 'No' : 'Yes',
    loan_source: loan_source.slug,
    loan_type: loan_type.name,
    current_state: state,
    current_step: current_step.name,
    created_at: moment(created_at).format('DD-MM-YYYY'),
  };
};

// use this -> https://www.npmjs.com/package/parallel-transform
// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { whereQry, user, reportDetails } = job.data;

  try {
    //   { key: 'total_time', header: 'Current/Total time\r\n(hh:mm:ss)' },
    //   { key: 'disbursed_date', header: 'Disbursed Date' },

    const csvStringify = stringify({
      header: true,
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'refrence_no', header: 'Reference No.' },
        { key: 'phone_number', header: 'Phone Number' },
        { key: 'business_employment', header: 'Business/Employment' },
        { key: 'bank', header: 'Bank (Account Number)' },
        { key: 'amount', header: 'Amount' },
        { key: 'monthly_repayment_amount', header: 'Repayment' },
        { key: 'purpose', header: 'Purpose' },
        { key: 'collateral_offered', header: 'Collateral' },
        { key: 'maturity_tenor', header: 'Maturity Tenor' },
        { key: 'repayment_frequency', header: 'Frequency' },
        { key: 'repeat_loan', header: 'RPT Loan' },
        { key: 'current_step', header: 'Dept (Desk)' },
        { key: 'current_state', header: 'Status' },
        { key: 'loan_source', header: 'Source' },
        { key: 'loan_type', header: 'Type' },
        { key: 'created_at', header: 'Created Date' },
      ],
    });

    const results = await LoanApplication.findAll({
      where: whereQry,
      attributes: {
        exclude: ['business_employment_id', 'loan_source_id', 'bank_detail_id'],
      },
      include: [
        {
          model: Applicants,
          as: 'applicant',
          attributes: ['title', 'name', 'phone_number'],
        },
        { model: LoanState, as: 'current_state', attributes: { exclude: ['order'] } },
        {
          model: Department,
          as: 'current_step',
          attributes: { exclude: ['loan_process_order', 'description'] },
        },
        { model: LoanType, as: 'loan_type', require: true },
        { model: LoanSource, as: 'loan_source', require: true },
        {
          model: BusinessEmployment,
          as: 'business_employment',
          include: [{ model: BusinessEmploymentType, as: 'business_employment_type' }],
        },
        {
          model: ClientBank,
          as: 'client_bank',
          attributes: [
            [
              sequelize.literal(`(
            SELECT name
            FROM banks
            WHERE
                banks.id = client_bank.bank_id
            )`),
              'bank_name',
            ],
            'account_name',
            'account_number',
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      subQuery: false,
    });

    const ps = new PassThrough();

    await asyncPipeline(
      Readable.from(results),
      new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform(chunk, enc, done) {
          const ll = transformData(chunk);

          this.push(ll);
          done();
        },
      }),
      csvStringify,
      ps
    );

    const startDate = whereQry.created_at.$between[0];
    const endDate = whereQry.created_at.$between[1];
    const requestBy = user.fullname;

    // Setup page header
    const loanSummary = `
        LOAN SOURCE: ${loanSource} \n
        START DATE: ${startDate} \n
        END DATE: ${endDate} \n
        TOTAL DISBURSED: ${cf.format(totalDisbursed, { code: 'NGN' })} \n
        PENDING DISBURSEMENT: ${cf.format(pendingDisbursed, { code: 'NGN' })} \n
        REQUESTED BY: ${requestBy} \n
        TOTAL APPLICATION: ${results.length}
    `;

    let bufs = [];
    await (() =>
      new Promise((resolve, reject) => {
        ps.on('data', (d) => bufs.push(d));
        ps.on('error', (err) => reject(err));
        ps.on('end', () => {
          bufs = Buffer.concat(bufs);
          return resolve();
        });
      }))();

    const file = {
      buffer: bufs,
      size: bufs.byteLength,
      originalname: `${slugify(reportDetails.title)}.csv`,
    };

    const uploader = new UploadService();
    const upload = await uploader.uploadFile(null, file, null);

    const dataBuffer = Buffer.from(
      JSON.stringify({
        email_type: 'ExportLoanToCsv',
        title: reportDetails.title,
        file_path: upload.message,
        file_name: file.originalname,
        summary: loanSummary,
        user,
      })
    );

    await pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
  } catch (e) {
    Bugsnag.notify(e);
  }
  return Promise.resolve();
};

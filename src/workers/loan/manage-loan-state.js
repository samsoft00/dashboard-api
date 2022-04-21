// eslint-disable-next-line func-names
import moment from 'moment';
import cf from 'currency-formatter';
import { QueryTypes } from 'sequelize';
import { inRange } from 'lodash';
import config from 'config';
import { PubSub } from '@google-cloud/pubsub';
import Bugsnag from '@bugsnag/js';
import {
  sequelize,
  LoanApplication,
  LoanState,
  ApproveAuthority,
  Department,
  ClientBank,
  LoanLogs,
  Roles,
} from '../../database/models';
import LoanFlow from '../../flow/LoanFlow';
import loanJson from '../../flow/loan.json';

const { email_broadcast_topic } = config.get('gcp');
const frontend_login_url = config.get('general.fontendUrl');

Bugsnag.start({
  apiKey: config.get('general.bugsnag'),
  appType: 'worker',
});

const pubSubClient = new PubSub({
  keyFilename: process.env.GQUEUE_KEYFILE,
});

const manageLoanState = async (data) => {
  const { loan_id } = data;
  // setup approval

  try {
    const loan = await LoanApplication.findOne({
      where: { id: loan_id },
      include: [
        { model: LoanState, as: 'current_state' },
        { model: Department, as: 'current_step' },
        { model: ApproveAuthority, as: 'approve_authority' },
      ],
    });

    if (loan.registration_status === 'update_required') {
      await ApproveAuthority.destroy({ where: { loan_id } });
      return Promise.resolve();
    }

    if (loan.approve_authority.length === 0) {
      return Promise.resolve();
    }

    const approvalAuth = loan.getDefaultAuthority();
    const r = approvalAuth.authority.map((auth) => auth.role.toUpperCase());

    const roles = await Roles.findAll({ where: { code: { $in: r } } });
    const promises = [];

    // eslint-disable-next-line radix
    if (
      loan.current_step.slug === 'RISK_MANAGEMENT' &&
      inRange(loan.amount, 500000.01) // 100000.01
    ) {
      roles.forEach((role) => promises.push({ loan_id: loan.id, role_id: role.id }));
    }

    if (loan.current_step.slug === 'MANAGEMENT') {
      roles.forEach((role) => promises.push({ loan_id: loan.id, role_id: role.id }));
    }

    if (promises.length) {
      await ApproveAuthority.bulkCreate(promises);
      await loan.update({ require_approval: true });

      const IN = roles.map((role) => role.id).join(',');
      const payload = await sequelize.query(
        `
        SELECT DISTINCT(email), fullname
        FROM user u
        INNER JOIN user_roles r 
        WHERE u.id = r.user_id AND r.role_id IN (${IN})
        `,
        { type: QueryTypes.SELECT }
      );

      payload.forEach((d) => {
        const dataBuffer = Buffer.from(
          JSON.stringify({
            email_type: 'NotifyApprovalAuth',
            email: d.email,
            name: d.fullname.split(' ')[0],
            amount: cf.format(loan.amount, { code: 'NGN' }),
            frontend_login_url,
            reference_no: loan.refrence_no,
            created_at: moment(loan.created_at).format('dddd, MMMM Do, YYYY'),
          })
        );

        pubSubClient.topic(email_broadcast_topic).publish(dataBuffer);
      });
    }

    return Promise.resolve();
  } catch (error) {
    Bugsnag.notify(error);
  }
};

const moveLoanToState = async (data, state) => {
  // eslint-disable-next-line no-unused-vars
  const { loan, user_id, approval_id } = data;

  // move to audit
  const newLoanFlow = new LoanFlow();
  newLoanFlow.loadFlows(loanJson);

  const iterator = await newLoanFlow.getIterator();
  const { next_state, next_step, collection } = iterator.goto(state);

  const t = await sequelize.transaction();
  try {
    const logger = {
      loan_id: loan.id,
      from_id: loan.current_state.id,
      to_id: next_state.id,
      from_who_id: user_id,
      dept_id: next_step.id,
      comment: `Loan application approved for processing`,
      timeline: moment().add(collection.timeline, 'hours').toDate(),
    };

    // update loan if no more approval
    await LoanApplication.update(
      {
        require_approval: false,
        current_state_id: next_state.id,
        current_step_id: next_step.id,
      },
      { where: { id: loan.id }, transaction: t }
    );

    await LoanLogs.create(logger, { transaction: t });

    await t.commit();
    return Promise.resolve();
  } catch (error) {
    await t.rollback();

    Bugsnag.notify(error);
  }
};

const confirmAccountNo = async (data) => {
  try {
    const loan = await LoanApplication.findOne({
      where: { id: data.loan_id },
    });

    if (!loan) return Promise.resolve();

    await ClientBank.update({ confirmed: true }, { where: { id: loan.bank_detail_id } });
  } catch (error) {
    Bugsnag.notify(error);
  }
};

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { name } = job;
  switch (name) {
    case 'manage-loan-state':
      await manageLoanState(job.data);
      break;

    case 'move-loan-audit':
      // await moveLoanToState(job.data, 'AUDIT');
      await moveLoanToState(job.data, 'DISBURSEMENT');
      break;

    case 'move-loan-offer':
      await moveLoanToState(job.data, 'OFFER_LETTER');
      break;

    case 'confirm-account-number':
      await confirmAccountNo(job.data);
      break;

    default:
      break;
  }
};

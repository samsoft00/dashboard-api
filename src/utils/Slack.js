import { WebClient } from '@slack/web-api';
import cf from 'currency-formatter';
import config from 'config';
import moment from 'moment';

import Utility from './Utility';

const { token, channelId, channelLoan } = config.get('slack');

/**
 * Slack Messaging Utilities
 * [https://api.slack.com/reference/messaging/attachments]
 * [https://api.slack.com/apps/A01KTCT5PTM/install-on-team?]
 */
export default class Slack {
  static async sendSlackAlertForLoanTimeline(loan) {
    if (!token) {
      return false;
    }

    const { applicant, logs, refrence_no, loan_type, loan_source, current_step } = loan;

    // logs[0].created_at,
    const totalspent = Utility.getTotalProcessTime(
      moment().format('YYYY-MM-DD HH:mm:ss'),
      logs[logs.length - 1].created_at
    );

    const web = new WebClient(token);

    await web.chat.postMessage({
      channel: channelLoan,
      type: 'mrkdwn',
      text: `:stopwatch: LOAN Application with *Ref: ${refrence_no}* is currently _delayed_ beyond the expected timeline.`,
      attachments: [
        {
          color: '#ab0202',
          fields: [
            {
              title: 'Current Dept',
              value: `[${current_step.id}] ${current_step.name}`,
              short: true,
            },
            {
              title: 'Loan Type',
              value: loan_type.name,
              short: true,
            },
            {
              title: '[Title] Applicant Name',
              value: `[${applicant.title}] ${applicant.name}`,
              short: true,
            },
            {
              title: 'Loan Source',
              value: loan_source ? loan_source.name : 'Unknown Source',
              short: true,
            },
            {
              title: 'Date Created',
              value: moment(loan.created_at).format('YYYY-MM-DD hh:mm A'),
              short: true,
            },
            {
              title: 'Delay time (H:mm:ss)',
              value: totalspent,
              short: true,
            },
          ],
        },
      ],
    });
  }

  static async sendSlackAlertForFxTimeline(fxOrder) {
    if (!token) {
      return false;
    }

    const {
      exchange_rate,
      reference_no,
      current_step,
      current_state,
      transaction_type,
      total_payment,
      currency_from,
      currency_to,
      customer,
      volume,
      logs,
    } = fxOrder;

    // logs[0].created_at,
    const totalspent = Utility.getTotalProcessTime(
      moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      logs[logs.length - 1].created_at
    );

    const web = new WebClient(token);

    await web.chat.postMessage({
      channel: channelId,
      type: 'mrkdwn',
      text: `:stopwatch: FX ORDER with *Ref: ${reference_no}* is currently _delayed_ beyond the expected timeline.`,
      attachments: [
        {
          color: '#ab0202',
          fields: [
            {
              title: 'Customer Name',
              value: customer.id ? `[${customer.id}] ${customer.name}` : `${customer.name}`,
              short: true,
            },
            {
              title: 'Currency (From/To)',
              value: `${currency_from.locale}/${currency_to.locale}`,
              short: true,
            },
            {
              title: '[Rate] Volume',
              value: `[${exchange_rate}] ${volume}`,
              short: true, // from:usd - to:eur
            },
            {
              title: 'Total Payment',
              value: `${cf.format(total_payment, { code: currency_from.locale })}`,
              short: true,
            },
            {
              title: '[State] Current Dept',
              value: `[${current_state.name}] ${current_step.name}`,
              short: true,
            },
            {
              title: 'Transaction Type',
              value: transaction_type.name,
              short: true,
            },
            {
              title: 'Date Created',
              value: moment(fxOrder.created_at).format('YYYY-MM-DD hh:mm A'),
              short: true,
            },
            {
              title: 'Delay time (H:mm:ss)',
              value: totalspent,
              short: true,
            },
          ],
        },
      ],
    });
  }
}

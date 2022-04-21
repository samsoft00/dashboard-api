import {
  LoanApplication,
  Applicants,
  LoanSource,
  Department,
  LoanType,
  LoanLogs,
  User,
} from '../../database/models';
import Slack from '../../utils/Slack';
import ErrorLog from '../../errors/bugsnag';

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { loans } = job.data;

  const whereQry = { id: loans };

  const options = {
    where: whereQry,
    attributes: {
      exclude: ['loan_detail_id'],
    },
    include: [
      { model: Applicants, as: 'applicant' },
      { model: LoanType, as: 'loan_type' },
      { model: LoanSource, as: 'loan_source' },
      {
        model: Department,
        as: 'current_step',
        attributes: { exclude: ['loan_process_order', 'description'] },
      },
      {
        model: LoanLogs,
        as: 'logs',
        attributes: ['id', 'timeline', 'comment', 'created_at'],
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
  };

  try {
    const getLoans = await LoanApplication.findAndCountAll(options);
    if (!getLoans.count) return Promise.resolve();

    const promises = [];
    getLoans.rows.forEach((loan) => promises.push(Slack.sendSlackAlertForLoanTimeline(loan)));

    return Promise.all(promises);
  } catch (error) {
    ErrorLog(error);
  }
};

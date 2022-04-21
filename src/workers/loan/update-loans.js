import {
  sequelize,
  LoanApplication,
  BusinessEmployment,
  Applicants,
  ClientBank,
} from '../../database/models';

module.exports = async function (job) {
  const loan = job.data;

  if (loan.registration_status === 'pending') return Promise.resolve();

  const loan_details = await sequelize.query(
    `SELECT * from loan_detail WHERE id = ${loan.loan_detail_id}`,
    {
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const client_bank = await sequelize.query(
    `SELECT * from client_bank WHERE id = ${loan.client_bank_id}`,
    {
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const {
    loan_amount: amount,
    repayment_frequency,
    monthly_repayment_amount,
    maturity_tenor,
    collateral_offered,
    loan_purpose: purpose,
  } = loan_details[0];

  // update the following
  await ClientBank.update(
    { applicant_id: loan.applicant_id },
    { where: { id: loan.client_bank_id } }
  );

  await BusinessEmployment.update(
    { applicant_id: loan.applicant_id },
    { where: { id: loan.business_employment_id } }
  );

  await LoanApplication.update(
    {
      applicant_id: loan.applicant_id,
      amount,
      repayment_frequency,
      monthly_repayment_amount,
      maturity_tenor,
      collateral_offered,
      purpose,
      bank_detail_id: loan.client_bank_id,
    },
    { where: { id: loan.id } }
  );

  await Applicants.update({ bvn: client_bank[0].bvn }, { where: { id: loan.applicant_id } });

  // client bank
  // update businessEmply
  // loan
  console.log(`process ${loan.applicant_id}`);
  return Promise.resolve();
};

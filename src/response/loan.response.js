/**
 * Loan Response format class
 */

export default class LoanResponse {
  constructor(loan, applicant, docs) {
    const {
      id,
      refrence_no,
      amount,
      monthly_repayment_amount,
      maturity_tenor,
      collateral_offered,
      purpose,
      repayment_frequency,
      repeat_loan,
      require_approval,
      registration_status,
      created_at,
      updated_at,
      applicant_id,
      ...loanProps
    } = loan.toJSON();

    return {
      id,
      refrence_no,
      amount,
      monthly_repayment_amount,
      maturity_tenor,
      collateral_offered,
      purpose,
      repayment_frequency,
      repeat_loan,
      require_approval,
      registration_status,
      applicant,
      ...loanProps,
      docs,
      created_at,
      updated_at,
    };
  }
}

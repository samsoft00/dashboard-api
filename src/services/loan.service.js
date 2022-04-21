/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
/* eslint-disable prefer-destructuring */
/* eslint-disable prettier/prettier */
/* eslint-disable radix */
import { QueryTypes } from 'sequelize';
import { pick, merge } from 'lodash';
import ValidatorHelper from '../utils/ValidatorHelper';
import CustomError from '../utils/CustomError';
import { sequelize, LoanState, LoanApplication, Department } from '../database/models';

const {
  validateLoanApp,
  validateLoanBankDetails,
  validateBusiness: validateBusinessDetails,
} = ValidatorHelper;

// fields
const FORM_APPLICATION = [
  'name',
  'title',
  'date_of_birth',
  'gender',
  'marital_status',
  'home_address',
  'landmark',
  'phone_number',
  'religion',
  'place_of_worship',
  'mother_maiden_name',
  'email_address',
  'place_of_issuance',
  'id_card_number',
  'date_issued',
  'expiry_date_issued',
  'repeat_loan',

  'spouse_name',
  'spouse_phone_number',
  'spouse_occupation_id',

  'loan_type_id',
  'loan_source_id',
  'identity_type_id',
  'education_id',
  'occupation_id',
  'lga_id',
  'place_of_birth_id',
];

const LOAN_BANK_DETAIL = [
  'amount',
  'repayment_frequency',
  'monthly_repayment_amount',
  'maturity_tenor',
  'collateral_offered',
  'loan_purpose',

  'bank_id',
  'account_number',
  'bvn',
  'account_name',
];

const BUSINESS_EMPLOYMENT_FIELDS = [
  'business_name',
  'business_employment_type_id',
  'business_office_address',
  'business_activity',
  'year_of_experience',
  'office_phone_no',
  'email_address',
  'position',
  'monthly_income',
  'monthly_expenses',
];

const REJECT_ERROR =
  'Error occur while rejecting loan application, assign to Loan Head or Managing Director!';
const FAST_FORWARD_ERROR = "You can't fast-forward loan application, kindly, assign to Loan Head!";

// const ONE_MILLION = 1000000;
// const loanAmount = loan.amount;
// } else if (loanAmount >= ONE_MILLION) {
//   nextState = 'MD_APPROVAL';
//   nextSteps = 'MANAGING_DIRECTOR';
// } else {

export default class LoanService {
  /**
   * Validate input fields
   */
  static async validateFields(tag, body) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        let payload;
        let validateResp;

        switch (tag) {
          case 1:
            payload = pick(body, FORM_APPLICATION);
            validateResp = await validateLoanApp().validateAsync(payload);
            break;
          case 2:
            payload = pick(body, BUSINESS_EMPLOYMENT_FIELDS);
            validateResp = await validateBusinessDetails().validateAsync(payload);
            break;

          case 3:
            payload = pick(body, LOAN_BANK_DETAIL);
            validateResp = await validateLoanBankDetails().validateAsync(payload);
            break;
          default:
            return reject(new CustomError('Something went wrong, check tag number!'));
        }

        resolve(validateResp);
      } catch (e) {
        return reject(e);
      }
    });
  }

  static async loanNextLevel(loan, iterator, assignTo, request_update = false, query, user) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const { action } = query;

      try {
        const actionList = ['rejected', 'fast_forward'];

        const dept = await Department.findAll({ order: [['loan_process_order', 'ASC']] });
        const loanState = await LoanState.findAll({ order: [['order', 'ASC']] });

        const currentState = loan.current_state;
        // const currentStep = loan.current_step;

        const { next_state, next_step, collection } = iterator.next();

        let nextState;
        let nextSteps;
        let timeline = 2;

        if (action && actionList.indexOf(action) > -1) {
          switch (action) {
            // the only dept that can reject loan is head_credit, md_approval, others can request update
            case 'rejected':
              if (!user.isHeadCredit() || !user.isManager()) throw new CustomError(REJECT_ERROR);
              nextState = 'REJECTED';
              nextSteps = 'AUDIT'; // reject goes to audit
              break;

            case 'fast_forward':
              if (!user.isHeadCredit()) throw new CustomError(FAST_FORWARD_ERROR);
              // check if offer letter has been uploaded.
              const check = loan.docs.filter(
                (list) => list.doc_url !== null && list.name === 'Signed Offer Letter'
              )[0];

              if (!check) {
                nextState = 'OFFER_LETTER';
                nextSteps = 'LOAN_OFFICER';
                timeline = 0;
              } else {
                // if fast forward, o ya go OPERATION
                // nextState = 'AUDIT';
                // nextSteps = 'AUDIT';
                nextState = 'DISBURSEMENT';
                nextSteps = 'OPERATION';
                timeline = 2;
              }
              break;
          }
        } else if (request_update === true) {
          //  && currentState.slug !== 'NEW'
          nextSteps =
            assignTo && assignTo.department.slug === 'TEAM_SUPERVISOR'
              ? 'TEAM_SUPERVISOR'
              : 'LOAN_OFFICER';
          nextState = 'UPDATE_REQUIRED';
          timeline = 2;
        } else {
          switch (currentState.slug) {
            case 'NEW':
              // if (user.isTeamSupervisor()) {
              //   const n = iterator.goto('IN_REVIEW');
              //   nextState = n.next_state.slug;
              //   nextSteps = n.next_step.slug;
              // } else {
              nextState = next_state.slug;
              nextSteps = next_step.slug;
              timeline = collection.timeline;
              // }
              break;

            case 'IN_PROGRESS':
            case 'MD_APPROVAL':
            // case 'AUDIT': // <--
              nextState = next_state.slug;
              nextSteps = next_step.slug;
              timeline = collection.timeline;
              break;

            case 'UPDATE_REQUIRED':
              nextSteps = 'TEAM_SUPERVISOR';
              nextState = 'IN_PROGRESS';

              // if (user.isTeamSupervisor()) {
              //   nextSteps = 'RISK_MANAGEMENT';
              //   nextState = 'IN_REVIEW';
              // }
              timeline = 4;
              break;

            case 'IN_REVIEW':
              // check if loan type == Busness loan (RLCN)
              // All asset travel advance product (RLCN) should stop with Risk Management. none should go to the MD
              if (/RLCN/.test(loan.loan_type.name)) {
                nextState = 'DISBURSEMENT';
                nextSteps = 'OPERATION';
              } else {
                nextState = next_state.slug;
                nextSteps = next_step.slug;
              }
              timeline = 4;
              break;

            case 'DISBURSEMENT':
              nextState = 'CLOSED';
              nextSteps = 'AUDIT';
              break;

            default:
              //check if user attempt to move loan to audit
              if(/AUDIT/.test(currentState.slug)) {
                throw new CustomError(
                  'Oops, You can\'t move Loan Application to Audit, Audit Dept is not within the loan application pipeline.'
                  );
              }

              throw new CustomError(
                `Loan Application with Refrence No: ${loan.refrence_no}, already closed or rejected!`
              );
            // break;
          }
        }

        nextSteps = dept.filter((d) => d.slug === nextSteps)[0];
        nextState = loanState.filter((s) => s.slug === nextState)[0];

        return resolve({ next_state: nextState, next_step: nextSteps, timeline });
      } catch (error) {
        return reject(error);
      }
    });
  }

  static async getLoanStateByDept(dept) {
    const whereQry = {};

    switch (dept.slug) {
      case 'LOAN_OFFICER':
        merge(whereQry, { slug: { $in: ['NEW', 'UPDATE_REQUIRED', 'OFFER_LETTER'] } });
        break;
      case 'TEAM_SUPERVISOR':
        merge(whereQry, { slug: { $in: ['UPDATE_REQUIRED', 'IN_PROGRESS'] } });
        break;
      case 'RISK_MANAGEMENT':
        merge(whereQry, { slug: { $in: ['IN_REVIEW'] } });
        break;
      case 'MANAGEMENT':
        merge(whereQry, { slug: { $in: ['MD_APPROVAL'] } });
        break;
      case 'AUDIT':
        merge(whereQry, { slug: { $in: ['AUDIT', 'CLOSED', 'REJECTED'] } });
        break;
      case 'OPERATION':
      case 'FINANCE':
        merge(whereQry, { slug: { $in: ['DISBURSEMENT'] } });
        break;
      default:
        merge(whereQry, { slug: 'NONE' }); // Loan officer
        break;
    }

    const i = await LoanState.findAll({ where: whereQry });
    return i.map((s) => s.id);
  }

  static async getLoanState(loan_state) {
    const whereQry = {};

    switch (loan_state) {
      case 'DISBURSEMENT':
        merge(whereQry, { slug: 'CLOSED' });
        break;

      case 'REJECTED':
        merge(whereQry, { slug: 'REJECTED' });
        break;
    }

    return LoanState.findOne({ where: whereQry });
  }

  static getLoanCheckList(loanId) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const checkList = await sequelize.query(
          `SELECT c.id, c.name, lc.doc_url FROM check_lists c 
          inner join loan_app_check_list lc
          ON lc.check_list_id=c.id WHERE lc.loan_application_id=:loanId`,
          {
            replacements: { loanId },
            type: QueryTypes.SELECT,
          }
        );

        resolve(checkList);
      } catch (error) {
        return reject(error);
      }
    });
  }

  static async findLoanOrFail(loan_id, query) {
    const loan = await LoanApplication.findOne({
      where: { id: loan_id, ...query },
    });

    if (!loan) throw new CustomError(`Loan application with ID ${loan_id} not found!`, 404);
    return loan;
  }
}

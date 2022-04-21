import { inRange } from 'lodash';
import {
  ApproveAuthority,
  Department,
  LoanState,
  LoanApplication,
  CheckList,
  LoanType,
  Roles,
} from '../database/models';

import ResUtil from '../utils/RespUtil';
import LoanFlow from '../flow/LoanFlow';
import loanJson from '../flow/loan.json';
import CustomError from '../utils/CustomError';
import ErrorHandler from '../errors/error.handler';

const util = new ResUtil();
const PERMISSION_MESSAGE =
  'You are not authorized to move this loan application, check your current department and role';

const approveAuth = async (req, res, next) => {
  const { user } = req;
  const { loan_id } = req.params;

  try {
    const loan = await LoanApplication.findOne({
      where: { id: loan_id },
      include: [
        { model: LoanState, as: 'current_state' },
        { model: Department, as: 'current_step' },
        { model: LoanType, as: 'loan_type' },
        {
          model: ApproveAuthority,
          as: 'approve_authority',
          attributes: ['id', 'status'],
          include: [{ model: Roles, as: 'role' }],
        },
        { model: CheckList, as: 'docs' },
      ],
    });

    const newLoanFlow = new LoanFlow(loan);
    newLoanFlow.loadFlows(loanJson);
    const iterator = await newLoanFlow.getIterator();

    // First check
    if (!loan) throw new CustomError('Loan Application not found!');

    if (loan.registration_status === 'pending')
      throw new CustomError(
        `Loan application still pending completion, ensure you upload all require documents!`,
        404
      );

    // Second check ~ state
    const loanToIgnore = ['CLOSED', 'REJECTED'];
    if (loan.current_state && loanToIgnore.includes(loan.current_state.slug))
      throw new CustomError(
        `Loan application with Reference Number ${loan.refrence_no} CLOSED or REJECTED`
      );

    if (loan.current_state.slug === 'OFFER_LETTER') {
      throw new CustomError(
        `Loan application with Reference Number ${loan.refrence_no} awaiting for offer letter`
      );
    }

    if (loan.require_approval)
      throw new CustomError(
        `Loan Application with Reference Number ${loan.refrence_no} is waiting for approval, kindly check with authorities`
      );

    // Third check ~ dept
    // if (current_step.slug !== user.department.slug) {
    //   throw new CustomError(401, PERMISSION_MESSAGE);
    // }

    // cc -> means collection
    const { collection: cc } = iterator.current();
    const approval = loan.getDefaultAuthority();

    // Forth check ~ Ensure roles
    let default_roles = cc.roles ? cc.roles.filter((role) => role.enable).map((r) => r.role) : null;

    if (loan.current_step.slug === 'RISK_MANAGEMENT') {
      const loanAmount = loan.amount;
      const stageRole = cc.stages.filter((stage) => inRange(loanAmount, stage.max_loan_amount))[0];

      default_roles = stageRole.roles.filter((role) => role.enable).map((r) => r.role);
    }
    // this is needed
    if (loan.current_step.slug === 'MANAGEMENT') {
      default_roles = new Set(approval.authority.map((auth) => auth.role));
      default_roles = Array.from(default_roles);
    }

    const intersection = user.roles.filter((x) => default_roles.includes(x.code.toLowerCase()));
    if (!intersection.length) {
      throw new CustomError(PERMISSION_MESSAGE, 401);
    }

    // payload
    req.payload = {
      loan,
      iterator,
    };

    console.log(loan.current_step, loan.current_state, default_roles, user.roles);
    return next();
  } catch (e) {
    const error = new ErrorHandler(e);
    return util.setError(error.statusCode || 400, error.message).send(res);
  }
};

export default approveAuth;

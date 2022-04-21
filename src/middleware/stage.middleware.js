import ResUtil from '../utils/RespUtil';

import LoanFlow from '../flow/LoanFlow';
import loanJson from '../flow/loan.json';

/*
 * Loan Application STEPS (Department)
 * 1. NEW (LOAN_OFFICER)
 * 2. LOAN_SUPERVISOR
 * 3. RISK_MANAGEMENT
 * 4. MD (MANAGING_DIRECTOR)
 * 5. OPERATION
 */

// Setup loan flow
const newLoanFlow = new LoanFlow();
newLoanFlow.loadFlows(loanJson);

const util = new ResUtil();

const loanOfficer = (req, res, next) => {
  const { user } = req;
  if (user.department.slug === 'LOAN_OFFICER') return next();

  return util
    .setError(
      401,
      'You are not authorized to initiate loan application, kindly assign to a loan officer!'
    )
    .send(res);
};

const loanSuperVisor = (req, res, next) => {
  const { user } = req;
  if (user.department.slug === 'LOAN_SUPERVISOR') return next();

  return util
    .setError(
      401,
      'You are not authorized to initiate loan application, kindly assign to a loan officer or supervisor!'
    )
    .send(res);
};

const loanEditors = async (req, res, next) => {
  const { user } = req;

  const iterator = await newLoanFlow.getIterator();
  const { collection: cc } = iterator.current();

  // check dept
  const hasDept = cc.depts
    .map((d) => d.slug.toUpperCase())
    .includes(user.department.slug.toUpperCase());

  const i = cc.roles.map((r) => r.role);
  const hasRole = user.roles.filter((x) => i.includes(x.code.toLowerCase()));

  if (hasDept && hasRole.length) return next();

  return util
    .setError(
      401,
      'You are not authorized to perform this action, kindly assign to a loan officer or supervisor!'
    )
    .send(res);
};

const fxCreator = (req, res, next) => {
  const { user } = req;

  const dept = user.department;
  if (dept.slug === 'RELATION_OFFICER') return next();

  return util
    .setError(
      401,
      'You are not authorized to perform this action, kindly assign to a relation officer!'
    )
    .send(res);
};

/**
 * Only allow BDC to create BDC Order
 */
const bdcManagers = (req, res, next) => {
  const { user } = req;
  // check if department contain BDC
  if (/_BDC/.test(user.department.slug)) return next();

  return util
    .setError(
      401,
      'You are not authorized to perform this action, kindly assign to a any BDC Staff!'
    )
    .send(res);
};

export { loanOfficer, loanSuperVisor, loanEditors, fxCreator, bdcManagers };

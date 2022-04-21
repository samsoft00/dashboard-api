import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware';
import approveAuth from '../../middleware/approve.middleware';
import { loanEditors } from '../../middleware/stage.middleware';
import LoanController from '../../controllers/loan.controller';

const router = Router();

// Role => admin
/*
router.get(
  '/loan_application',
  [isAuthenticated, mustBeAdmin],
  LoanController.getAllLoanApplication
);
*/
router.get('/loan_application', isAuthenticated, LoanController.getLoanAppByLoggedInUser);

router.get('/loan_application/report', isAuthenticated, LoanController.getAllLoanApplication);

// Loan Summary API
router.get('/loan_application/summary', isAuthenticated, LoanController.loanSummaryApi);

// Export Loan
router.get('/loan_application/export-loans', isAuthenticated, LoanController.exportLoanToCSV);

// GET Loan
router.get('/loan_application/:loan_id', isAuthenticated, LoanController.getLoanApplicationByID);

// UPDATE Loan
router.put(
  '/loan_application/:loan_id',
  [isAuthenticated, loanEditors],
  LoanController.updateLoanApplication
);

// Loan comments
router.post(
  '/loan_application/:loan_id/comment',
  isAuthenticated,
  LoanController.addLoanAppComment
);
router.delete(
  '/loan_application/:loan_id/comment/:comment_id',
  isAuthenticated,
  LoanController.deleteLoanAppComment
);

// Continue with new Loan
/*
router.post(
  '/loan_application/:loan_id',
  [isAuthenticated, loanEditors], // loanOfficer
  LoanController.loanAppContinuatn
);
*/
// create new loan
router.post(
  '/loan_application/:applicant_id/new',
  [isAuthenticated, loanEditors], // loanOfficer
  LoanController.startNewLoanApplication
);

// Upload new doc
router.post(
  '/loan_application/:loan_id/upload',
  [isAuthenticated, loanEditors], // loanOfficer
  LoanController.uploadLoanAppFiles
);

// Update doc
router.put(
  '/loan_application/:loan_id/upload',
  [isAuthenticated, loanEditors],
  LoanController.uploadLoanAppFiles
);

// Duplicate loan
router.post(
  '/loan_application/:loan_id/duplicate',
  [isAuthenticated, loanEditors],
  LoanController.duplicateLoan
);

// Role => admin
/*
router.post(
  '/loan_application/:loan_id/assign',
  [isAuthenticated, mustBeAdmin],
  LoanController.assignLoanToStaff
);
*/
router.post(
  '/loan_application/:loan_id/manage',
  [isAuthenticated, approveAuth],
  LoanController.manageLoanApp
);
/*
router.get('/loan_application/state/:state_id', isAuthenticated, LoanController.getLoanAppByState);

router.get(
  '/loan_application/user/:user_id',
  isAuthenticated,
  LoanController.getLoanAppAssignToUser
);

router.get(
  '/loan_application/department/:dept_id',
  isAuthenticated,
  LoanController.getLoanAppByDept
);

// Route to setup and generate approval auth
router.get('/loan_application/:loan_id/setupapproval', LoanController.setupFailApproval);
*/
router.get(
  '/loan_application/:loan_id/checklist',
  isAuthenticated,
  LoanController.getLoanAppChecklist
);

router.get(
  '/loan_application/:loan_id/approve/:approval_id',
  isAuthenticated,
  LoanController.loanApprovalByLoanId
);

export default router;

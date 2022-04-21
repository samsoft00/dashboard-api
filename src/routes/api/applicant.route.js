import { Router } from 'express';
import ApplicantController from '../../controllers/applicant.controller';
import BS from '../../controllers/business.controller';
import BankCtrl from '../../controllers/loanbank.controller';

import { isAuthenticated } from '../../middleware/auth.middleware';

const router = Router();

router.get('/applicants', isAuthenticated, ApplicantController.getApplicants);
router.get('/applicant/:applicant_id', isAuthenticated, ApplicantController.getApplicantById);
router.post('/applicant', isAuthenticated, ApplicantController.createNewApplicant);
router.put('/applicant/:applicant_id', isAuthenticated, ApplicantController.updateApplicant);
router.get(
  '/applicant/:applicant_id/loan-histories',
  isAuthenticated,
  ApplicantController.getLoanHistories
);

// Bank Details
router.post('/applicant/:applicant_id/bank_details', isAuthenticated, BankCtrl.createBankDetail);
router.get('/applicant/:applicant_id/bank_details/:id', isAuthenticated, BankCtrl.getBankDetail);
router.put('/applicant/:applicant_id/bank_details/:id', isAuthenticated, BankCtrl.updateBankDetail);
router.delete(
  '/applicant/:applicant_id/bank_details/:id',
  isAuthenticated,
  BankCtrl.deleteBankDetail
);

// Business & Employment
router.post('/applicant/:applicant_id/employment', isAuthenticated, BS.addBusinessEmply);
router.get('/applicant/:applicant_id/employment/:emply_id', isAuthenticated, BS.getBusinessEmply);
router.put('/applicant/:applicant_id/employment/:emply_id', BS.updateBusinessEmply);
router.delete('/applicant/:applicant_id/employment/:emply_id', BS.deleteBusinessEmply);

export default router;

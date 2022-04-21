import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import MiscController from '../../controllers/misc.controller';

const router = Router();

router.get('/loan-type', MiscController.getLoanType);
router.get('/loan-states', MiscController.getLoanStates);
router.get('/occupations', MiscController.getOccupation);
router.get('/identification', MiscController.getIdentity);
router.get('/employment-type', MiscController.getEmploymentType);
// router.get('/business-employment-type', MiscController.getBusinessEmploymentType);
router.get('/banks', MiscController.getBankList);
router.get('/checklist', MiscController.getChecklist);
router.get('/currency-type', MiscController.getCurrencyType);
router.get('/loan-sources', MiscController.getLoanSources);

export default router;

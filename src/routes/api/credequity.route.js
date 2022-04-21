import { Router } from 'express';
import CredequityController from '../../controllers/credequity.controller';

import { isAuthenticated } from '../../middleware/auth.middleware';
import trackReqResMiddleware from '../../middleware/trackreqres.middleware';

const router = Router();

router.post(
  '/credequity/check_midi',
  [isAuthenticated, trackReqResMiddleware],
  CredequityController.checkMidi
);

router.post(
  '/credequity/credit_check',
  [isAuthenticated, trackReqResMiddleware],
  CredequityController.creditCheckPro
);

router.get('/credequity/reports', isAuthenticated, CredequityController.getRequestReport);

export default router;

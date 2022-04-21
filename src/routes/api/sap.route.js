import { Router } from 'express';
import SapController from '../../controllers/sap.controller';

const router = Router();

router.post('/sap/sendPortalLogin', SapController.sendPortalLogin);

export default router;

import { Router } from 'express';
import WebHookCtrl from '../../controllers/webhook.controller';

const router = Router();

router.get('/webhooks/track-fx-order-timeline', WebHookCtrl.trackFxTimeline);

router.get('/webhooks/track-loan-timeline', WebHookCtrl.trackLoanTimeline);

router.get('/webhooks/update-stock-balance', WebHookCtrl.updateDailyStocks);

router.get('/webhooks/auto-move-loan-from-audit', WebHookCtrl.autoMoveLoanFromAudit);

export default router;

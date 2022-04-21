import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { checkStockBalance } from '../../middleware/bdc.middleware';
import { bdcManagers } from '../../middleware/stage.middleware';
import BdcController from '../../controllers/bdc.controller';

const router = Router();

router.get('/orders', isAuthenticated, BdcController.getBdcOrders);

router.get('/order/stock-balances', isAuthenticated, BdcController.getStockOrderBalance);

router.post(
  '/order/create-new-order',
  [isAuthenticated, bdcManagers, checkStockBalance],
  BdcController.createBdcOrder
);

router.get('/order/generate-daily-report', isAuthenticated, BdcController.generateDailyReport);

router.get('/order/download-reports', isAuthenticated, BdcController.downloadReports);

router.get('/order/:id', isAuthenticated, BdcController.getBdcOrderById);

// BDC Bank details
// -> add / update / get
router.get('/bank-details', isAuthenticated, BdcController.getBdcBankDetails);
router.post('/bank-detail', [isAuthenticated, bdcManagers], BdcController.addBankDetail);
router.get('/bank-detail/:id', isAuthenticated, BdcController.getBdctBankDetailByID);
router.put('/bank-detail/:id', [isAuthenticated, bdcManagers], BdcController.updateBankDetail);

// Update bdc stock balance
router.get('/stock-balances', isAuthenticated, BdcController.getStockBalance);
router.put('/stock-balance/:id', isAuthenticated, BdcController.updateStocks);

export default router;

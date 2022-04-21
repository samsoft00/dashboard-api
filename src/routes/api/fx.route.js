import { Router } from 'express';
import FxController from '../../controllers/fx.controller';

import { fxCreator } from '../../middleware/stage.middleware';
import { isAuthenticated } from '../../middleware/auth.middleware';
import Upload from '../../middleware/docupload.middleware';
// import customerMiddleware from '../../middleware/customer.middleware';

const router = Router();

router.post(
  '/fx_orders',
  [isAuthenticated, fxCreator], // customerMiddleware
  FxController.createFxOrder
);

router.get('/fx_orders', isAuthenticated, FxController.getLoggedInFxOrders);

router.get('/fx_orders/all', isAuthenticated, FxController.fetchAllFxOrder);

router.get('/fx_order/transaction-types', FxController.getTransactionTypes);

router.get('/fx_order/exportfx', isAuthenticated, FxController.exportFxOrdersToCSV);

// router.get('/fx_order/daily-sales-report', FxController.dailySalesReport); // isAuthenticated

router.get('/fx-order/customers', isAuthenticated, FxController.aggregateFxOrder);

router.get('/fx-order/customer/:phone', isAuthenticated, FxController.getFxCustomerData);

router.get(
  '/fx_order/customer_bank/:customer_kyc_id',
  isAuthenticated,
  FxController.fetchCustomerBank
);

router.get('/fx_order/:fx_id', isAuthenticated, FxController.getFxOrderById);

router.put('/fx_order/:fx_id', isAuthenticated, FxController.updateFxOrder);

router.delete('/fx_order/:fx_id', isAuthenticated, FxController.deleteFxOrderById);

router.post('/fx_order/:fx_id/manage', isAuthenticated, FxController.manageFxOrder);

router.post('/fx_order/:fx_id/comment', isAuthenticated, FxController.addFxOrderComment);

router.delete(
  '/fx_order/:fx_id/comment/:comment_id',
  isAuthenticated,
  FxController.deleteFxOrderComment
);

router.post(
  '/fx_order/:fx_id/attach-support-doc',
  [isAuthenticated, Upload.single('file')],
  FxController.uploadSupportDoc
);

router.delete(
  '/fx_order/:fx_id/attach-support-doc/:doc_id',
  isAuthenticated,
  FxController.removeUploadDoc
);

export default router;

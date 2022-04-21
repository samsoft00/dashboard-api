import config from 'config';
import { Worker } from 'bullmq';
import path from 'path';
import Redis from 'ioredis';

require('events').EventEmitter.defaultMaxListeners = 55;

const { env } = config.get('general');
const redisConfig = config.get('redis');
const connection = new Redis(redisConfig, { maxRetriesPerRequest: null, enableReadyCheck: false });

const qWorker = (name, processor) => {
  return new Worker(name, path.join(__dirname, `../workers/${processor}`), { connection });
};

/**
 * Queue Event Service
 */
const loadQueueWorker = () => {
  if (['test'].includes(process.env.NODE_ENV) || env === 'test') {
    return connection.disconnect();
  }

  qWorker('send-login-email', 'email/process-login-mail.js');
  qWorker('send-assign-to-mail-fx', 'email/send-assign-to-mail-fx.js');
  qWorker('send-assign-to-mail', 'email/send-assign-to-mail.js');
  qWorker('send-invoice-email', 'email/process-invoice-email.js');
  qWorker('credequity-log', 'fx-order/process-credequity-log.js');
  qWorker('reset-password-mail', 'email/process-reset-password-mail.js');
  qWorker('export-file-to-csv-mail', 'fx-order/export-file-to-csv-mail.js');
  qWorker('fx-order-created', 'fx-order/process-fx-order-created.js');
  qWorker('export-loan-to-csv', 'loan/export-loan-to-csv.js');
  qWorker('loan-escalatn-queue', 'loan/loan-escalatn-queue.js');
  qWorker('fx-escalatn-queue', 'fx-order/fx-escalatn-queue.js');
  qWorker('loan-queue', 'loan/manage-loan-state.js');
  qWorker('process-activity', 'user/process-user-activity');
  qWorker('update-loans', 'loan/update-loans');
  qWorker('send-bdc-report', 'bdc/send-bdc-report');
};

loadQueueWorker();

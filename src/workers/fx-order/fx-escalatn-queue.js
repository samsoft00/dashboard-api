import {
  FxOrderLogs,
  Department,
  FxState,
  CurrencyType,
  FxOrder,
  TransactionTypes,
} from '../../database/models';
import Slack from '../../utils/Slack';
import ErrorLog from '../../errors/bugsnag';

// eslint-disable-next-line func-names
module.exports = async function (job) {
  const { orders } = job.data;
  const whereQry = { id: orders };

  const options = {
    where: whereQry,
    attributes: {
      exclude: ['currency_type_id', 'current_state_id', 'current_step_id'],
    },
    include: [
      { model: CurrencyType, as: 'currency_from' },
      { model: CurrencyType, as: 'currency_to' },
      { model: TransactionTypes, as: 'transaction_type' },
      {
        model: FxState,
        as: 'current_state',
        attributes: { exclude: ['order'] },
        required: true,
      },
      {
        model: Department,
        as: 'current_step',
        attributes: { exclude: ['loan_process_order', 'description'] },
      },
      {
        model: FxOrderLogs,
        as: 'logs',
        attributes: ['created_at'],
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['logs', 'created_at', 'DESC'],
    ],
    subQuery: false,
  };

  try {
    const fx_orders = await FxOrder.findAndCountAll(options);
    if (!fx_orders.count) return Promise.resolve();

    // send message to slack
    // email cto

    const promises = [];
    fx_orders.rows.forEach((order) => promises.push(Slack.sendSlackAlertForFxTimeline(order)));

    return Promise.all(promises);
  } catch (error) {
    ErrorLog(error);
    return Promise.resolve();
  }
};

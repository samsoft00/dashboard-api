import { BdcStock } from '../database/models';
import ResUtil from '../utils/RespUtil';
import CustomError from '../utils/CustomError';

const util = new ResUtil();

const checkStockBalance = async (req, res, next) => {
  try {
    // check if bdc stock is set
    const { user } = req;
    const i = await BdcStock.findAll({ where: { bdc_dept_id: user.department.id } });

    if (!i.length || !i.every((stocks) => stocks.stock_balance > 0)) {
      throw new CustomError(
        `Stock balances are not set, please, ensure all balances are set before you proceed.`
      );
    }

    next();
  } catch (error) {
    return util.setError(error.statusCode || 400, error.message).send(res);
  }
};

export { checkStockBalance };

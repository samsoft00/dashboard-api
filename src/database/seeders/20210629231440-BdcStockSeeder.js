const moment = require('moment');
const Decimal = require('decimal.js');

/* eslint-disable no-unused-vars */
module.exports = {
  up: async (qi, Sequelize) => {
    const t = await qi.sequelize.transaction();

    try {
      const bdcStockBaln = await qi.sequelize.query(`SELECT * FROM bdc_stock_balances`, {
        type: qi.sequelize.QueryTypes.SELECT,
      });

      const bstocks = await qi.sequelize.query(`SELECT * FROM bdc_stocks`, {
        type: qi.sequelize.QueryTypes.SELECT,
      });

      if (bdcStockBaln.length > 0 && bstocks.length > 0) return;

      const currencies = await qi.sequelize.query(`SELECT * FROM currency_types`, {
        type: qi.sequelize.QueryTypes.SELECT,
      });

      let depts = await qi.sequelize.query(`SELECT * FROM department`, { type: qi.sequelize.QueryTypes.SELECT })
      depts = depts.filter(d => /_BDC/.test(d.slug))

      const bdcStocks = [];
      const bdcStckBalance = [];
      const balance = new Decimal(0); // ['test'].includes(process.env.NODE_ENV) ? new Decimal(1) : new Decimal(0);

      for(const dept of depts){

        currencies.map((currency) =>
          bdcStocks.push({
            currency_type_id: currency.id,
            bdc_dept_id: dept.id,
            stock_balance: balance.toFixed(2),
          })
        );

      }

      await qi.bulkInsert('bdc_stocks', bdcStocks, { returning: true, transaction: t });

      const stocks = await qi.sequelize.query(`SELECT * FROM bdc_stocks`, {
        type: qi.sequelize.QueryTypes.SELECT,
        transaction: t,
      });

      stocks.map((stock) =>
        bdcStckBalance.push({
          bdc_stock_id: stock.id,
          bdc_dept_id: stock.bdc_dept_id,
          opening_balance: balance.toFixed(2),
          closing_balance: balance.toFixed(2),
          created_at: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
          updated_at: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        })
      );

      await qi.bulkInsert('bdc_stock_balances', bdcStckBalance, { transaction: t });

      await t.commit();
    } catch (error) {
      console.log(error)
      t.rollback();
    }
  },

  down: async (qi, Sequelize) => {
    return Promise.all([
      qi.bulkDelete('bdc_stock_balances', null, {}),
      qi.bulkDelete('bdc_stocks', null, {}),
    ]);
  },
};

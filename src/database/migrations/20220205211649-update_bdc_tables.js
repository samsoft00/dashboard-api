'use strict';
import { sequelize } from '../models';

/**
 * Updates table
 * 1. BdcBankDetail <- bdc_dept_id
 * 2. StockBalance <- 
 * 3. BdcStocks <-
 * 4. BdcOrders
 * 5. BdcOrderReport <-
 */
module.exports = {
  async up (qi, Sequelize) {

    return qi.sequelize.transaction(t => {
      return Promise.all([
        qi.addColumn('bdc_bank_details', 'bdc_dept_id', {
          after: 'bank_id',
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'department' }, key: 'id' }
        }, { transaction: t }),
        qi.addColumn('bdc_stock_balances', 'bdc_dept_id', {
          after: 'closing_balance',
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'department' }, key: 'id' }  
        }, { transaction: t }),
        qi.addColumn('bdc_stocks', 'bdc_dept_id', {
          after: 'stock_balance',
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'department' }, key: 'id' }
        }, { transaction: t }),
        qi.addColumn('bdc_order_reports', 'bdc_dept_id', {
          after: 'file_path',
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'department' }, key: 'id' }
        }, { transaction: t }),
        qi.changeColumn('bdc_orders', 'bdc_dept_id', {
          type: Sequelize.INTEGER,
          allowNull: false
        }, { transaction: t })
      ])
    })
     
  },

  async down (qi, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     return qi.sequelize.transaction(t => {
      return Promise.all([
        qi.removeColumn('bdc_bank_details', 'bdc_dept_id', { transaction: t }),
        qi.removeColumn('bdc_stock_balances', 'bdc_dept_id', { transaction: t }),
        qi.removeColumn('bdc_order_reports', 'bdc_dept_id', { transaction: t }),
        qi.removeColumn('bdc_stocks', 'bdc_dept_id', { transaction: t }),
      ])
    })
  }
};

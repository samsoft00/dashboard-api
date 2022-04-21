'use strict';

module.exports = {
  up: async (qi, Sequelize) => {
    return Promise.all([
      qi.addColumn('bdc_orders', 'bdc_dept_id', {
        after: 'bdc_bank_detail_id',
        type: Sequelize.INTEGER,
        references: { model: { tableName: 'department' }, key: 'id' },
      }),
      qi.removeColumn('bdc_orders', 'bdc_company'),
    ]);
  },

  down: async (queryInterface, Sequelize) => {},
};

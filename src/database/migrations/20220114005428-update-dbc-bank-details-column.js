'use strict';

module.exports = {
  up: async (qi, Sequelize) => {
    return Promise.all([
      qi.addColumn('bdc_bank_details', 'is_disabled', {
        after: 'account_name',
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }),
    ]);
  },

  down: async (qi, Sequelize) => {
    await qi.removeColumn('bdc_bank_details', 'is_disabled');
  },
};

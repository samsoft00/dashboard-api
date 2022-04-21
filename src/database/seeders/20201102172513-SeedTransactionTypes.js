/* eslint-disable no-unused-vars */

const transactionTypesJson = require('../../../data/transaction-types.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sources = await queryInterface.sequelize.query(`SELECT id from transaction_types;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (sources.length > 0) return;

    /**
     * Order Types are more than 2, can we move it to the backend please,
     * incase there's more tomorrow  (Swap, Refund, inflow or Outflow)
     */
    await queryInterface.bulkInsert('transaction_types', transactionTypesJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('transaction_types', null, {});
  },
};

/* eslint-disable no-unused-vars */

const currencyTypes = require('../../../data/currency.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const types = await queryInterface.sequelize.query(`SELECT id from currency_types;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (types.length > 0) return;

    await queryInterface.bulkInsert('currency_types', currencyTypes, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('currency_types', null, {});
  },
};

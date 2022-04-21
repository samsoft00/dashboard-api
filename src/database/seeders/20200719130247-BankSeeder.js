/* eslint-disable no-unused-vars */
// [https://nigerianbanks.xyz/]

const bankJson = require('../../../data/bank.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const banks = await queryInterface.sequelize.query(`SELECT id from banks;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (banks.length > 0) return;

    return queryInterface.bulkInsert('banks', bankJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('banks', null, {});
  },
};

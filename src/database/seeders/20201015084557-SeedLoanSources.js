/* eslint-disable no-unused-vars */

const loanSourcesJson = require('../../../data/loan-sources.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sources = await queryInterface.sequelize.query(`SELECT id from loan_sources;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (sources.length > 0) return;
    await queryInterface.bulkInsert('loan_sources', loanSourcesJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('loan_sources', null, {});
  },
};

/* eslint-disable no-unused-vars */

const loanTypeJson = require('../../../data/loan-type.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const type = await queryInterface.sequelize.query(`SELECT id from loan_type;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (type.length > 0) return;
    return queryInterface.bulkInsert('loan_type', loanTypeJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('loan_type', null, {});
  },
};

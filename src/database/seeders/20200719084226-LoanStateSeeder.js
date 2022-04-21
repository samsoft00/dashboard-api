/* eslint-disable no-unused-vars */
const loanStates = require('../../../data/loan-state.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const loanState = await queryInterface.sequelize.query(`SELECT id from loan_states;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (loanState.length > 0) return;

    return queryInterface.bulkInsert('loan_states', loanStates, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('loan_states', null, {});
  },
};

/* eslint-disable no-unused-vars */

const fxStateJson = require('../../../data/fx-states.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const states = await queryInterface.sequelize.query(`SELECT id from fx_states;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (states.length > 0) return;

    await queryInterface.bulkInsert('fx_states', fxStateJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('fx_states', null, {});
  },
};

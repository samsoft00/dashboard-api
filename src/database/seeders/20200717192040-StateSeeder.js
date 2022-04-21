/* eslint-disable no-unused-vars */
const path = require('path');
const log = require('fancy-log');
const fs = require('fs');

const stateJson = require('../../../data/states.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const state = await queryInterface.sequelize.query(`SELECT id from state;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (state.length > 0) return;

    return queryInterface.bulkInsert('state', stateJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('state', null, {});
  },
};

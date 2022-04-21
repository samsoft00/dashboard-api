/* eslint-disable no-unused-vars */
const path = require('path');
const log = require('fancy-log');
const fs = require('fs');

const lgaJson = require('../../../data/lga.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const lga = await queryInterface.sequelize.query(`SELECT id from lga;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (lga.length > 0) return;

    return queryInterface.bulkInsert('lga', lgaJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('lga', null, {});
  },
};

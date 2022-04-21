/* eslint-disable no-unused-vars */
const path = require('path');
const fs = require('fs');
const log = require('fancy-log');

const cityJson = require('../../../data/cites.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const city = await queryInterface.sequelize.query(`SELECT id from city;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (city.length > 0) return;

    return queryInterface.bulkInsert('city', cityJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('city', null, {});
  },
};

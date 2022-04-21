/* eslint-disable no-unused-vars */

const identityJson = require('../../../data/identityJson.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const identification = await queryInterface.sequelize.query(`SELECT id from identity_types;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (identification.length > 0) return;
    return queryInterface.bulkInsert('identity_types', identityJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('identity_types', null, {});
  },
};

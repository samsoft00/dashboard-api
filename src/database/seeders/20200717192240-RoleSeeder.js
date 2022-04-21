/* eslint-disable no-unused-vars */

const roleJson = require('../../../data/roles.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = await queryInterface.sequelize.query(`SELECT id from roles;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (roles.length > 0) return;

    return queryInterface.bulkInsert('roles', roleJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('roles', null, {});
  },
};

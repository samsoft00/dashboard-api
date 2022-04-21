/* eslint-disable no-unused-vars */

const occupationJson = require('../../../data/occupation.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const occupation = await queryInterface.sequelize.query(`SELECT id from occupation;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (occupation.length > 0) return;
    return queryInterface.bulkInsert('occupation', occupationJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('occupation', null, {});
  },
};

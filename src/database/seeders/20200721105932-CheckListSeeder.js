/* eslint-disable no-unused-vars */

const checkListJson = require('../../../data/checklist.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const list = await queryInterface.sequelize.query(`SELECT id from check_lists;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (list.length > 0) return;

    return queryInterface.bulkInsert('check_lists', checkListJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('check_lists', null, {});
  },
};

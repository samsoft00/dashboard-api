/* eslint-disable no-unused-vars */

const educationJson = require('../../../data/education.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const education = await queryInterface.sequelize.query(`SELECT id from education;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (education.length > 0) return;
    return queryInterface.bulkInsert('education', educationJson, {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('education', null, {});
  },
};

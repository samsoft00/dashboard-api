/* eslint-disable no-unused-vars */

const businessEmplyType = require('../../../data/business-empy-type.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const empType = await queryInterface.sequelize.query(
      `SELECT id from business_employment_type;`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (empType.length > 0) return;
    await queryInterface.bulkInsert('business_employment_type', businessEmplyType, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('business_employment_type', null, {});
  },
};

/* eslint-disable no-unused-vars */
const { Department } = require('../models');
const departments = require('../../../data/dept.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dept = await queryInterface.sequelize.query(`SELECT id from department;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (dept.length > 0) return;

    // return queryInterface.bulkInsert(
    // 'department',
    // { individualHooks: true, validate: true }
    // );

    await Department.bulkCreate(departments);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('department', null, {});
  },
};

/* eslint-disable no-unused-vars */
const { Department } = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sources = await queryInterface.sequelize.query(
      `SELECT * from department WHERE name = :name`,
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
        replacements: { name: 'audit' },
      }
    );

    if (sources.length) return;

    const auditDept = [
      {
        name: 'Audit',
        description: 'Financial Auditor to handle payment processed',
        loan_process_order: 7,
      },
    ];

    await Department.bulkCreate(auditDept);
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.bulkDelete('department', null, {});
  },
};

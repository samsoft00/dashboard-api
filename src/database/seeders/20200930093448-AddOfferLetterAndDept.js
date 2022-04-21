/* eslint-disable no-unused-vars */
const { Department } = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const seq = queryInterface.sequelize;

    const checkList = await seq.query(`SELECT * from check_lists WHERE name = :name`, {
      replacements: { name: 'Signed Offer Letter' },
      type: seq.QueryTypes.SELECT,
    });

    const checkDept = await seq.query(`SELECT * from department WHERE name IN(:name)`, {
      replacements: { name: ['Relation Officer', 'Internal Control', 'Finance'] },
      type: seq.QueryTypes.SELECT,
    });

    // process.exit(1);

    if (checkList.length === 0) {
      // add check lists
      await queryInterface.bulkInsert(
        'check_lists',
        [
          {
            name: 'Signed Offer Letter',
            title: 'applicant',
          },
        ],
        {}
      );
    }

    if (checkDept.length === 0) {
      // Add departments
      const departments = [
        {
          name: 'Relation Officer',
          description:
            "Relation officer handle the concerns of the people who buy their company's products or services. They work to rectify issues experienced by individual customers as well as aim to improve the organization's overall customer satisfaction ratings.",
          loan_process_order: 1,
        },
        {
          name: 'Internal Control',
          description:
            'Internal controls are the mechanisms, rules, and procedures implemented by a company to ensure the integrity of financial and accounting information, promote accountability, and prevent fraud',
          loan_process_order: 2,
        },
        {
          name: 'Finance',
          description: 'Finance handle payout and management of large amounts of money',
          loan_process_order: 3,
        },
      ];

      await Department.bulkCreate(departments);
    }
  },

  down: async (queryInterface, Sequelize) => {},
};

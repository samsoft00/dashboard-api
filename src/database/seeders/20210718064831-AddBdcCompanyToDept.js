/* eslint-disable no-unused-vars */
// Add donnette, sebastian to department
module.exports = {
  up: async (qi, Sequelize) => {
    const checkBdc = await qi.sequelize.query(
      `SELECT * FROM department WHERE slug = 'DONNETTE_BDC'`,
      {
        type: qi.sequelize.QueryTypes.SELECT,
      }
    );

    if (checkBdc.length > 0) return;

    await qi.bulkInsert(
      'department',
      [
        {
          name: 'Donnette BDC',
          slug: 'DONNETTE_BDC',
          loan_process_order: 0,
          description: 'About Donnette BDC',
        },
        {
          name: 'Sebastian BDC',
          slug: 'SEBASTIAN_BDC',
          loan_process_order: 0,
          description: 'About Sebastian BDC',
        },
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.bulkDelete('People', null, {});
  },
};

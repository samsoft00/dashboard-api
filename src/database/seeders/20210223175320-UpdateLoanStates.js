/* eslint-disable no-unused-vars */
const { LoanState } = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const states = [
      { name: 'NEW', slug: 'NEW', order: 1 },
      { name: 'UPDATE REQUIRED', slug: 'UPDATE_REQUIRED', order: 0 },
      { name: 'IN REVIEW', slug: 'IN_REVIEW', order: 3 },
      { name: 'MD APPROVAL', slug: 'MD_APPROVAL', order: 4 },
      { name: 'DISBURSEMENT', slug: 'DISBURSEMENT', order: 7 },
      { name: 'REJECTED', slug: 'REJECTED', order: 0 },
      { name: 'CLOSED', slug: 'CLOSED', order: 8 },
      { name: 'AUDIT', slug: 'AUDIT', order: 6 },
      { name: 'OFFER LETTER', slug: 'OFFER_LETTER', order: 5 },
      { name: 'IN PROGRESS', slug: 'IN_PROGRESS', order: 2 },
    ];

    const promises = [];
    states.forEach((state) =>
      promises.push(LoanState.findOrCreate({ where: { slug: state.slug }, defaults: { ...state } }))
    );

    await Promise.all(promises);
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.bulkDelete('loan_state', null, {});
  },
};

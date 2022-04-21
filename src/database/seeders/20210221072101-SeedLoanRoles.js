/* eslint-disable no-unused-vars */
const { flattenDeep, uniqWith, isEqual } = require('lodash');
const { Roles } = require('../models');
const loanFlow = require('../../flow/loan.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = loanFlow.map((flow) =>
      flow.roles ? flow.roles : flow.stages.map((stage) => stage.roles)
    );
    const updateRoles = uniqWith(flattenDeep(roles), isEqual);
    const promise = [];

    updateRoles.forEach((r) =>
      Roles.findOrCreate({
        where: { code: r.role },
        defaults: { name: r.name.toUpperCase(), code: r.role.toUpperCase(), description: '' },
      })
    );

    await Promise.all(promise);
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.bulkDelete('roles', null, {});
  },
};

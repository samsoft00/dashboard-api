/* eslint-disable no-unused-vars */
const crypto = require('crypto');
const moment = require('moment');
const { User, UserRoles, Roles, Department } = require('../models');

const userJson = require('../../../data/user.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!['test', 'development'].includes(process.env.NODE_ENV)) {
      return;
    }

    const user = await queryInterface.sequelize.query(`SELECT id from user;`, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    if (user.length > 0) return;

    const arrUserRoles = {};
    const roleObject = [];
    const userObject = [];

    try {
      const roles = await Roles.findAll();

      for (const role of roles) {
        userJson.map((u) => {
          const check = u.roles.includes(role.code);

          if (check) {
            if (!Array.isArray(arrUserRoles[u.email])) {
              arrUserRoles[u.email] = [role.id];
            }
            arrUserRoles[u.email].push(role.id);
          }
          //
        });
      }

      // console.log(arrUserRoles);

      for (const u of userJson) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(u.password, salt, 10000, 512, 'sha512').toString('hex');

        Object.assign(u, { password: `${salt}$${hash}` });
        const { roles, ...usr } = u;

        userObject.push(User.create({ ...usr }));
      }

      const userLists = await Promise.all(userObject);

      userLists.map((l) => {
        const roleIds = Array.from(new Set(arrUserRoles[l.email]));
        roleObject.push(l.setRoles(roleIds));
      });

      await Promise.all(roleObject);
    } catch (error) {
      console.log(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('user', null, {});
  },
};

/* eslint-disable no-unused-vars */
const { readFileSync } = require('fs');
const { join } = require('path');

module.exports = {
  up: async (qi, Sequelize) => {
    let splitQueries = [];

    try {
      // In this case, the database structure is already initialized
      await qi.sequelize.query(`SELECT * FROM user LIMIT 0;`, {
        type: qi.sequelize.QueryTypes.SELECT,
      });
    } catch (error) {
      // In this case, the database structure is not initialized
      const sqlQueries = readFileSync(
        join(__dirname, '..', '..', '..', 'data', 'dashboard_service.sql'),
        'utf8'
      );
      splitQueries = sqlQueries
        .toString()
        .replace(/^\s*[\r\n]/gm, '')
        .split(';');
    }

    try {
      for (const sql of splitQueries) {
        await qi.sequelize.query(sql);
      }
    } catch (err) {
      if (err.message !== 'Query was empty') {
        throw err;
      }
    }
  },

  down: async (qi, Sequelize) => {
    throw new Error('Cannot undo initial migration');
  },
};

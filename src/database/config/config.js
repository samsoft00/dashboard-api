const { Op } = require('sequelize');
const config = require('config');
const path = require('path');

require('sequelize/lib/utils/deprecations').noStringOperators = () => {};

// timezone settings
const timezone = '+01:00'; // Africa/Lagos
require('moment').tz.setDefault(timezone);

const { host, username, password, name } = config.get('database');
const dbDir = path.join(__dirname, '../__test__/database.sqlite');

/**
 * [https://stackoverflow.com/questions/29866133/cant-connect-to-mysql-with-sequelize]
 * [https://sequelize.org/master/manual/connection-pool.html]
 */
module.exports = {
  development: {
    username,
    password,
    database: name,
    host,
    dialect: 'mysql',
    logging: false,
    freezeTableName: true,
    // decimalNumbers: true,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    define: {
      // paranoid: true,
      // timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    operatorsAliases: {
      $eq: Op.eq,
      $like: Op.like,
      $substring: Op.substring,
      $or: Op.or,
      $and: Op.and,
      $between: Op.between,
      $lte: Op.lte,
      $in: Op.in,
    },
    dialectOptions: {
      decimalNumbers: true,
    },
    timezone,
  },
  test: {
    username,
    password,
    database: name,
    host,
    dialect: 'mysql',
    logging: false,
    freezeTableName: true,
    // decimalNumbers: true,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    define: {
      // paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    operatorsAliases: {
      $eq: Op.eq,
      $like: Op.like,
      $substring: Op.substring,
      $or: Op.or,
      $and: Op.and,
      $between: Op.between,
      $lte: Op.lte,
      $in: Op.in,
    },
    dialectOptions: {
      // charset: 'utf8',
      // collate: 'utf8_general_ci',
      decimalNumbers: true,
    },
    timezone,
  },
  production: {
    username,
    password,
    database: name,
    host,
    dialect: 'mysql',
    logging: false,
    freezeTableName: true,
    decimalNumbers: true,
  },
};

const { Model } = require('sequelize');
const { find } = require('lodash');
const crypto = require('crypto');
const sequelizePaginate = require('sequelize-paginate');

const loanJson = require('../../flow/loan.json');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate({ Roles, Department, AuditLog }) {
      // define association here
      this.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

      this.belongsToMany(Roles, {
        through: 'UserRoles',
        as: 'roles',
        foreignKey: { name: 'user_id' },
      });

      this.hasMany(AuditLog);
    }
  }

  User.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      fullname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      username: {
        type: DataTypes.STRING(70),
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true,
        },
      },
      phone_number: {
        type: DataTypes.STRING(30),
        unique: true,
        allowNull: true,
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      is_disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      last_login_ip: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      last_login_date: {
        type: 'TIMESTAMP',
        allowNull: true,
      },
      reset_token: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      reset_expires: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'user',
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ['department_id', 'createdAt', 'updatedAt', 'deletedAt'],
        },
      },
    },
    {
      scopes: {
        basic: {
          attributes: { exclude: ['password'] },
        },
      },
    }
  );

  User.prototype.validatePassword = function validatePassword(password) {
    return new Promise((resolve) => {
      const cred = this.password.split('$');
      const hash = crypto.pbkdf2Sync(password, cred[0], 10000, 512, 'sha512').toString('hex');
      return cred[1] === hash ? resolve(true) : resolve(false);
    });
  };

  User.prototype.isHeadCredit = function isHeadCredit() {
    return !!find(this.roles, { code: 'HEAD_CREDIT' });
  };

  User.prototype.isTeamSupervisor = function isTeamSupervisor() {
    return !!find(this.roles, { code: 'TEAM_SUPERVISOR' });
  };

  User.prototype.isManager = function isManager() {
    const managers = find(loanJson, { step: 'MANAGEMENT' });
    if (!managers) return false;

    const default_roles = managers.roles.map((r) => r.role);
    const hasRoles = this.roles.filter((x) => default_roles.includes(x.code.toLowerCase()));

    return !!hasRoles.length;
  };

  sequelizePaginate.paginate(User);
  return User;
};

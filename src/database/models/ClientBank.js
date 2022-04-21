/* eslint-disable no-unused-vars */

const { Model } = require('sequelize');
const { default: CustomError } = require('../../utils/CustomError');

module.exports = (sequelize, DataTypes) => {
  class ClientBank extends Model {
    static associate({ Bank }) {
      // define association here
      this.belongsTo(Bank, { foreignKey: 'bank_id', as: 'bank' });
    }
  }
  ClientBank.init(
    {
      applicant_id: DataTypes.INTEGER,
      bank_id: DataTypes.INTEGER,
      account_number: {
        type: DataTypes.STRING(50),
        unique: true,
        validate: { notEmpty: true, isNumeric: true },
      },
      account_name: DataTypes.STRING,
      confirmed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'ClientBank',
      tableName: 'client_bank',
      timestamps: false,
      defaultScope: {
        attributes: {
          exclude: ['applicant_id', 'bank_id'],
        },
        // include: [{ model: sequelize.models.Bank, as: 'bank' }],
      },
    }
  );

  ClientBank.findOrFail = async function findOrFail(query) {
    const results = await this.findOne({ where: query });
    if (!results) throw new CustomError('Client Bank detail not found!');
    return Promise.resolve(results);
  };

  ClientBank.prototype.isAttached = async function isAttached() {
    const check = await sequelize.query(
      `
      SELECT ll.id
      FROM loans ll
      LEFT JOIN loan_states cs ON ll.current_state_id = cs.id
      WHERE cs.slug IN ('CLOSED', 'REJECTED') AND ll.bank_detail_id = ${this.id}
      LIMIT 1
      `,
      { type: sequelize.QueryTypes.SELECT }
    );
    return !!check.length;
  };

  ClientBank.beforeCreate(async (instance, options) => {
    const check = await sequelize.query(
      `SELECT id 
      FROM client_bank 
      WHERE account_number = "${instance.account_number}"
      LIMIT 1`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (check.length) {
      throw new CustomError(`Account number ${instance.account_number} already exists!`);
    }
  });

  const ACCOUNT_ERR =
    "You can't perform this action, Bank Account already attached to active loan!";
  ClientBank.beforeUpdate(async (instance, options) => {
    const isAttched = await instance.isAttached();
    if (isAttched) throw new CustomError(ACCOUNT_ERR);
  });

  ClientBank.beforeDestroy(async (instance, options) => {
    // check if account is confirm or attached to current loan
    const isAttched = await instance.isAttached();
    if (instance.confirmed || isAttched) throw new CustomError(ACCOUNT_ERR);
  });

  return ClientBank;
};

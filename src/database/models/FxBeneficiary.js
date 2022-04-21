const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxBeneficiary extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(model) {
      // define association here
      // this.belongsTo(FxOrder, {
      //   foreignKey: { name: 'fx_order_id' },
      //   as: 'fx_order',
      // });
    }
  }
  FxBeneficiary.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      customer_kyc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      bank_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      account_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      account_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      iban_number: DataTypes.STRING(150),
      routing_number: DataTypes.STRING(100),
      swift_code: DataTypes.STRING(100),
      branch_sort_code: DataTypes.STRING(100),
    },
    {
      sequelize,
      modelName: 'FxBeneficiary',
      tableName: 'fx_beneficiaries',
      timestamps: false,
      defaultScope: {
        attributes: {
          exclude: ['customer_kyc_id'],
        },
      },
    }
  );
  return FxBeneficiary;
};

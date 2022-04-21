const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankDetail extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(model) {}
  }
  BankDetail.init(
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      bank_name: {
        type: DataTypes.STRING,
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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      iban_number: DataTypes.STRING,
      routing_number: DataTypes.STRING,
      swift_code: DataTypes.STRING,
      branch_sort_code: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'BankDetail',
      tableName: 'bank_details',
      timestamps: false,
    }
  );
  return BankDetail;
};

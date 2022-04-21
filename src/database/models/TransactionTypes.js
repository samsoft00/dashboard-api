const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TransactionTypes extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  TransactionTypes.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'TransactionTypes',
      tableName: 'transaction_types',
      timestamps: false,
    }
  );

  return TransactionTypes;
};

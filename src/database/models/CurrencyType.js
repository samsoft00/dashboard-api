const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CurrencyType extends Model {
    static associate(models) {
      // define association here
    }
  }
  CurrencyType.init(
    {
      name: DataTypes.STRING(100),
      locale: DataTypes.STRING(20),
    },
    {
      sequelize,
      modelName: 'CurrencyType',
      tableName: 'currency_types',
      timestamps: false,
    }
  );
  return CurrencyType;
};

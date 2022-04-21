const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanType extends Model {
    static associate(models) {
      // define association here
    }
  }
  LoanType.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'LoanType',
      tableName: 'loan_type',
      timestamps: false,
    }
  );
  return LoanType;
};

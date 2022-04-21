const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanSource extends Model {}

  LoanSource.init(
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING,
      slug: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'LoanSource',
      tableName: 'loan_sources',
      timestamps: false,
    }
  );
  return LoanSource;
};

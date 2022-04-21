/* eslint-disable no-unused-vars */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusinessEmploymentType extends Model {
    static associate(models) {
      // define association here
    }
  }
  BusinessEmploymentType.init(
    {
      name: DataTypes.STRING(100),
    },
    {
      sequelize,
      modelName: 'BusinessEmploymentType',
      tableName: 'business_employment_type',
      timestamps: false,
    }
  );
  return BusinessEmploymentType;
};

/* eslint-disable no-unused-vars */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClientOccupation extends Model {
    static associate(models) {
      // define association here
    }
  }
  ClientOccupation.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Occupation',
      tableName: 'occupation',
      timestamps: false,
    }
  );
  return ClientOccupation;
};

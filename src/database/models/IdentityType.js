const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IdentityType extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  IdentityType.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'IdentityType',
      tableName: 'identity_types',
      timestamps: false,
    }
  );
  return IdentityType;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Identification extends Model {
    static associate({ IdentityType }) {
      // define association here
      this.belongsTo(IdentityType, {
        foreignKey: { name: 'identity_type_id' },
        as: 'identity_type',
      });
    }
  }
  Identification.init(
    {
      id_card_number: DataTypes.STRING,
      date_issued: DataTypes.DATE,
      expiry_date_issued: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'Identification',
      tableName: 'identification',
      timestamps: false,
    }
  );
  return Identification;
};

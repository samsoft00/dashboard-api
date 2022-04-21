const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClientSpouse extends Model {
    static associate({ Occupation }) {
      // define association here
      this.belongsTo(Occupation, { foreignKey: { name: 'occupation_id' }, as: 'occupation' });
    }
  }
  ClientSpouse.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      // occupation: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'ClientSpouse',
      tableName: 'client_spouse',
      timestamps: false,
    }
  );
  return ClientSpouse;
};

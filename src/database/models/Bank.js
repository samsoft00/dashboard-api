const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Bank extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {}
  }
  Bank.init(
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
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Bank',
      tableName: 'banks',
      timestamps: false,
    }
  );
  return Bank;
};

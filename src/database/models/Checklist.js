/* eslint-disable no-unused-vars */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CheckList extends Model {
    static associate({ LoanApplication }) {
      // define association here

      this.belongsToMany(LoanApplication, {
        through: 'LoanAppCheckList',
        as: 'loans',
        foreignKey: { name: 'check_list_id' },
      });
    }
  }
  CheckList.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      title: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'CheckList',
      tableName: 'check_lists',
      timestamps: false,
    }
  );
  return CheckList;
};

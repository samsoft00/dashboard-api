/* eslint-disable no-unused-vars */
const { Model } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class LoanState extends Model {
    static associate(models) {}
  }
  LoanState.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: DataTypes.STRING(100),
      order: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'LoanState',
      tableName: 'loan_states',
      timestamps: false,
    }
  );

  LoanState.addHook('beforeUpdate', (state, options) => {
    Object.assign(state, {
      slug: slugify(state.name.toUpperCase(), '_'),
    });
  });

  return LoanState;
};

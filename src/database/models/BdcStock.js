const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BdcStock extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate({ CurrencyType, Department }) {
      this.belongsTo(CurrencyType, { foreignKey: { name: 'currency_type_id' }, as: 'currency' });
      this.belongsTo(Department, { foreignKey: { name: 'bdc_dept_id' }, as: 'bdc_dept' });
    }
  }
  BdcStock.init(
    {
      stock_balance: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'BdcStock',
      tableName: 'bdc_stocks',
      timestamps: false,
    }
  );

  return BdcStock;
};

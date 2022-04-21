const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BdcBankDetail extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate({ Bank, Department }) {
      this.belongsTo(Bank, { foreignKey: 'bank_id', as: 'bank' });
      this.belongsTo(Department, { foreignKey: { name: 'bdc_dept_id' }, as: 'bdc_dept' });
    }
  }
  BdcBankDetail.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      account_number: DataTypes.STRING,
      account_name: DataTypes.STRING,
      is_disabled: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'BdcBankDetail',
      tableName: 'bdc_bank_details',
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ['created_at', 'updated_at'],
        },
      },
    }
  );
  return BdcBankDetail;
};

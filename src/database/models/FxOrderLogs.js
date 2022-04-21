const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxOrderLogs extends Model {
    static associate({ FxOrder, User, Department, LoanState }) {
      // define association here
      this.belongsTo(FxOrder, { foreignKey: { name: 'fx_order_id' } });
      this.belongsTo(LoanState, { foreignKey: { name: 'from_id' }, as: 'from' });
      this.belongsTo(LoanState, { foreignKey: { name: 'to_id' }, as: 'to' });
      this.belongsTo(User, {
        foreignKey: { name: 'from_who_id', allowNull: false },
        as: 'from_who',
      });
      this.belongsTo(User, { foreignKey: { name: 'assign_to_id' }, as: 'assign_to' });
      this.belongsTo(Department, { foreignKey: { name: 'dept_id' }, as: 'desk' });
    }
  }
  FxOrderLogs.init(
    {
      timeline: DataTypes.DATE,
      comment: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'FxOrderLogs',
      tableName: 'fx_order_logs',
      timestamps: true,
      defaultScope: {
        attributes: {
          exclude: ['fx_order_id', 'from_id', 'to_id', 'from_who_id', 'assign_to_id', 'dept_id'],
        },
      },
    }
  );
  return FxOrderLogs;
};

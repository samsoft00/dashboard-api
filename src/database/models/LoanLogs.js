const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanLogs extends Model {
    static associate({ LoanApplication, User, Department, LoanState }) {
      // define association here
      this.belongsTo(LoanApplication, { foreignKey: { name: 'loan_id' } });
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
  LoanLogs.init(
    {
      timeline: DataTypes.DATE,
      comment: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'LoanLogs',
      tableName: 'loan_logs',
      timestamps: true,
      defaultScope: {
        attributes: {
          exclude: ['loan_id', 'from_id', 'to_id', 'from_who_id', 'assign_to_id', 'dept_id'],
        },
      },
    }
  );
  return LoanLogs;
};

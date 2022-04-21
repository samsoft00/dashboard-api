const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BdcOrderReport extends Model {
    static associate({ User }) {
      this.belongsTo(User, { foreignKey: 'generated_by', as: 'user' });
    }
  }
  BdcOrderReport.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      file_path: DataTypes.TEXT,
      generated_at: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: 'BdcOrderReport',
      tableName: 'bdc_order_reports',
      underscored: true,
      timestamps: false,
    }
  );
  return BdcOrderReport;
};

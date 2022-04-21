const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  ActivityLog.init(
    {
      ip: DataTypes.STRING,
      user_id: DataTypes.INTEGER,
      action: DataTypes.STRING,
      data: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: 'ActivityLog',
      tableName: 'activity_logs',
      timestamps: true,
      underscored: true,
    }
  );
  return ActivityLog;
};

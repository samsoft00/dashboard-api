const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CredequityLogs extends Model {
    static associate({ User }) {
      // define association here
      this.belongsTo(User, { foreignKey: { name: 'user_id' }, as: 'user' });
    }
  }
  CredequityLogs.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      api_url: DataTypes.STRING,
      req_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      req_payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      res_payload: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CredequityLogs',
      tableName: 'credequity_logs',
      underscored: true,
    }
  );
  return CredequityLogs;
};

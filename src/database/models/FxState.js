const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxState extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  FxState.init(
    {
      name: DataTypes.STRING(100),
      slug: DataTypes.STRING,
      message: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'FxState',
      tableName: 'fx_states',
      timestamps: false,
    }
  );
  return FxState;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxOrderComment extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {}
  }
  FxOrderComment.init(
    {
      title: DataTypes.STRING,
      fx_order_id: DataTypes.UUID,
      user_id: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'FxOrderComment',
      tableName: 'fx_order_comments',
      underscored: true,
      paranoid: true,
    }
  );
  return FxOrderComment;
};

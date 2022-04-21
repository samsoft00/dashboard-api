const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxOrderSupportDoc extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {}
  }
  FxOrderSupportDoc.init(
    {
      fx_order_id: DataTypes.UUID,
      description: DataTypes.TEXT,
      doc_url: DataTypes.STRING,
      upload_by_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'FxOrderSupportDoc',
      tableName: 'fx_order_support_doc',
      underscored: true,
      paranoid: true,
    }
  );
  return FxOrderSupportDoc;
};

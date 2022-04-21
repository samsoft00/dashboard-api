const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanAppComment extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {}
  }
  LoanAppComment.init(
    {
      loan_id: DataTypes.UUID,
      user_id: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'LoanAppComment',
      tableName: 'loan_app_comments',
      underscored: true,
      paranoid: true,
    }
  );
  return LoanAppComment;
};

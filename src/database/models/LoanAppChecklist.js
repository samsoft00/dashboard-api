const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanAppCheckList extends Model {
    static associate({ LoanApplication, CheckList }) {
      this.belongsTo(LoanApplication, {
        foreignKey: 'loan_application_id',
      });

      this.belongsTo(CheckList, {
        foreignKey: 'check_list_id',
      });
    }
  }
  LoanAppCheckList.init(
    {
      loan_application_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      check_list_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      doc_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LoanAppCheckList',
      tableName: 'loan_app_check_list',
      timestamps: false,
    }
  );
  return LoanAppCheckList;
};

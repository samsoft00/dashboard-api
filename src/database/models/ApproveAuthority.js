const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ApproveAuthority extends Model {
    static associate({ LoanApplication, Roles }) {
      // define association here
      this.belongsTo(LoanApplication, { foreignKey: { name: 'loan_id' } });

      this.belongsTo(Roles, {
        as: 'role',
        foreignKey: { name: 'role_id' },
      });
    }
  }
  ApproveAuthority.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      loan_id: DataTypes.UUID,
      user_id: DataTypes.INTEGER,
      status: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'ApproveAuthority',
      tableName: 'approve_authority',
      timestamps: false,
    }
  );
  return ApproveAuthority;
};

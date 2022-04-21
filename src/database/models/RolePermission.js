const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    static associate({ Roles, Permission }) {
      this.belongsTo(Roles, {
        foreignKey: { name: 'role_id' },
      });

      this.belongsTo(Permission, {
        foreignKey: { name: 'permission_id' },
        onDelete: 'cascade',
      });
    }
  }
  RolePermission.init(
    {
      role_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Roles',
          key: 'id',
        },
      },
      permission_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Permission',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'RolePermission',
      tableName: 'role_permission',
      timestamps: false,
    }
  );
  return RolePermission;
};

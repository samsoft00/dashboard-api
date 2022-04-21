const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate({ Roles }) {
      // define association here
      this.belongsToMany(Roles, {
        through: 'RolePermission',
        as: 'role',
        foreignKey: { name: 'permission_id' },
      });
    }
  }
  Permission.init(
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',
      timestamps: false,
    }
  );
  return Permission;
};

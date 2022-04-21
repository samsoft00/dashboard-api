const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Roles extends Model {
    static associate({ User, Permission }) {
      // define association here

      this.belongsToMany(Permission, {
        through: 'RolePermission',
        as: 'permissions',
        foreignKey: { name: 'role_id' },
      });

      this.belongsToMany(User, {
        through: 'UserRoles',
        as: 'users',
        foreignKey: { name: 'role_id' },
      });
    }
  }
  Roles.init(
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING(100),
      code: DataTypes.STRING(120),
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Roles',
      tableName: 'roles',
      timestamps: false,
    }
  );
  return Roles;
};

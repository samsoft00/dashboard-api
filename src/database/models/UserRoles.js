const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRoles extends Model {
    static associate({ User, Roles }) {
      this.belongsTo(Roles, {
        foreignKey: 'user_id',
      });

      this.belongsTo(User, {
        foreignKey: 'role_id',
      });
    }
  }

  UserRoles.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserRoles',
      tableName: 'user_roles',
      timestamps: false,
    }
  );
  return UserRoles;
};

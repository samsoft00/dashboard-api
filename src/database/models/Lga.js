const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Lga extends Model {
    static associate({ State }) {
      // define association here
      this.belongsTo(State, { foreignKey: { name: 'state_id' } });
    }
  }
  Lga.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Lga',
      tableName: 'lga',
      timestamps: false,
    }
  );
  return Lga;
};

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class City extends Model {
    static associate({ State }) {
      // define association here
      this.belongsTo(State, { foreignKey: { name: 'state_id' } });
    }
  }
  City.init(
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
      modelName: 'City',
      tableName: 'city',
      timestamps: false,
    }
  );
  return City;
};

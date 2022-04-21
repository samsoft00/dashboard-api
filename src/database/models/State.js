const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class State extends Model {
    static associate({ City, Lga }) {
      // define association here
      this.hasMany(Lga, { foreignKey: { name: 'state_id' }, as: 'lga' });
      this.hasMany(City, { foreignKey: { name: 'state_id' }, as: 'cities' });
    }
  }
  State.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING(150),
      lat: DataTypes.STRING(50),
      lng: DataTypes.STRING(50),
      min_lng: DataTypes.STRING(50),
      max_lng: DataTypes.STRING(50),
      min_lat: DataTypes.STRING(50),
      max_lat: DataTypes.STRING(50),
    },
    {
      sequelize,
      modelName: 'State',
      timestamps: false,
      tableName: 'state',
    }
  );
  return State;
};

const { Model } = require('sequelize');
const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  class ClientEducation extends Model {
    static associate(model) {
      // define association here
    }
  }
  ClientEducation.init(
    {
      name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Education',
      tableName: 'education',
      timestamps: false,
    }
  );
  sequelizePaginate.paginate(ClientEducation);

  return ClientEducation;
};

/* eslint-disable no-unused-vars */
const { Model } = require('sequelize');
const slugify = require('slugify');
const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate({ User }) {
      // define association here
      this.hasMany(User, { foreignKey: { name: 'department_id' }, as: 'users' });
    }
  }
  Department.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: DataTypes.STRING,
      slug: DataTypes.STRING,
      loan_process_order: DataTypes.INTEGER,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Department',
      tableName: 'department',
      timestamps: false,
    }
  );

  Department.addHook('beforeUpdate', (department, options) => {
    Object.assign(department, {
      slug: slugify(department.name.toUpperCase(), '_'),
    });
  });

  Department.addHook('beforeBulkCreate', (departments, options) => {
    // eslint-disable-next-line array-callback-return
    departments.map((department) => {
      Object.assign(department, {
        slug: slugify(department.name.toUpperCase(), '_'),
      });
    });
  });

  sequelizePaginate.paginate(Department);

  return Department;
};

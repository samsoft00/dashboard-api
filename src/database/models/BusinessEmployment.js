const { Model } = require('sequelize');
const { default: CustomError } = require('../../utils/CustomError');

module.exports = (sequelize, DataTypes) => {
  class BusinessEmployment extends Model {
    static associate({ LoanApplication, Applicants, BusinessEmploymentType }) {
      this.hasMany(LoanApplication, {
        foreignKey: { name: 'business_employment_id' },
        as: 'loans',
      });

      this.belongsTo(BusinessEmploymentType, {
        foreignKey: { name: 'business_employment_type_id', allowNull: false },
        as: 'business_employment_type',
      });

      this.belongsTo(Applicants, {
        foreignKey: { name: 'applicant_id', allowNull: false },
        as: 'applicants',
      });
    }
  }
  BusinessEmployment.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      business_name: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      business_office_address: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      business_activity: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      year_of_experience: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      office_phone_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email_address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      position: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      monthly_income: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      monthly_expenses: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'BusinessEmployment',
      tableName: 'business_employment',
      timestamps: false,
      defaultScope: {
        attributes: {
          exclude: ['applicant_id', 'business_employment_type_id'],
        },
      },
    }
  );

  BusinessEmployment.findOrFail = async function findOrFail(query) {
    const results = await this.findOne({
      where: query,
      include: [{ model: sequelize.models.LoanApplication, as: 'loans' }],
    });
    if (!results) throw new CustomError('Applicant Business/Employment information not found!');
    return Promise.resolve(results);
  };

  BusinessEmployment.prototype.isAttached = async function isAttached() {
    const check = await sequelize.query(
      `
      SELECT ll.id
      FROM loans ll
      LEFT JOIN loan_states cs ON ll.current_state_id = cs.id
      WHERE cs.slug IN ('CLOSED', 'REJECTED') AND ll.business_employment_id = ${this.id}
      `,
      { type: sequelize.QueryTypes.SELECT }
    );
    return !!check.length;
  };

  const ACCOUNT_ERR =
    "You can't perform this action, business/employment already attached to active loan!";

  // eslint-disable-next-line no-unused-vars
  BusinessEmployment.beforeUpdate(async (instance, options) => {
    const isAttched = await instance.isAttached();
    if (isAttched) throw new CustomError(ACCOUNT_ERR);
  });

  // eslint-disable-next-line no-unused-vars
  BusinessEmployment.beforeDestroy(async (instance, options) => {
    const isAttched = await instance.isAttached();
    if (isAttched) throw new CustomError(ACCOUNT_ERR);
  });

  return BusinessEmployment;
};

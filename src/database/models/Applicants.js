const { Model } = require('sequelize');
const { default: CustomError } = require('../../utils/CustomError');

module.exports = (sequelize, DataTypes) => {
  class Applicants extends Model {
    static associate({
      Lga,
      ClientBank,
      State,
      ClientSpouse,
      Identification,
      BusinessEmployment,
      LoanApplication,
      Education,
      Occupation,
    }) {
      // define association here
      this.belongsTo(ClientSpouse, {
        foreignKey: { name: 'spouse_id' },
        as: 'spouse',
      });
      this.belongsTo(Identification, { foreignKey: { name: 'identification_id' }, as: 'identity' });
      this.belongsTo(Education, {
        foreignKey: { name: 'education_id', allowNull: false },
        as: 'education',
      });
      this.belongsTo(State, {
        foreignKey: { name: 'place_of_birth_id', allowNull: false },
        as: 'place_of_birth',
      });
      this.belongsTo(Lga, { foreignKey: { name: 'lga_id' }, as: 'lga' });
      // this.belongsTo(ClientBank, { foreignKey: { name: 'client_bank_id' }, as: 'bank' });
      this.belongsTo(Occupation, {
        foreignKey: { name: 'occupation_id', allowNull: false },
        as: 'occupation',
      });
      this.hasMany(ClientBank, {
        foreignKey: { name: 'applicant_id', allowNull: false },
        as: 'bank_details',
      });
      this.hasMany(BusinessEmployment, {
        foreignKey: { name: 'applicant_id', allowNull: true },
        as: 'business_employment',
      });
      this.hasMany(LoanApplication, {
        foreignKey: { name: 'applicant_id', allowNull: true },
        as: 'loans',
      });
    }
  }
  Applicants.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      title: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      date_of_birth: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      gender: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['male', 'female'],
      },
      marital_status: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['married', 'single', 'complication'],
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
          args: true,
          msg: 'Oops. Looks like you already have an account. Please try to login.',
        },
      },
      mother_maiden_name: {
        type: DataTypes.STRING(150),
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
      home_address: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      landmark: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      religion: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      place_of_worship: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      bvn: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      place_of_issuance: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Applicants',
      tableName: 'applicants',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: [
            'education_id',
            'spouse_id',
            'identification_id',
            'deletedAt',
            'occupation_id',
            'place_of_birth_id',
            'lga_id',
            // 'bvn',
          ],
        },
      },
    }
  );

  Applicants.findOrFail = async function findOrFail(applicant_id) {
    const results = await this.findOne({
      where: { id: applicant_id },
      attributes: { include: ['identification_id', 'spouse_id'] },
      include: [
        {
          model: sequelize.models.BusinessEmployment,
          as: 'business_employment',
        },
        {
          model: sequelize.models.ClientBank,
          as: 'bank_details',
        },
        {
          model: sequelize.models.LoanApplication,
          as: 'loans',
        },
      ],
    });
    if (!results) throw new CustomError('Applicant not found!');
    return Promise.resolve(results);
  };

  Applicants.prototype.isRegisCompleted = function isRegisCompleted() {
    return !!this.business_employment.length && !!this.bank_details.length;
  };

  Applicants.prototype.isRepeatedLoan = function isRepeatedLoan() {
    return !!this.loans.length;
  };

  Applicants.prototype.hasPendingLoan = async function hasPendingLoan() {
    const check = await sequelize.query(
      `
      SELECT ll.id, cs.slug AS slug
      FROM loans ll
      LEFT JOIN loan_states cs ON ll.current_state_id = cs.id
      WHERE slug IN (
        SELECT slug FROM loan_states WHERE slug NOT IN ('CLOSED', 'REJECTED')
      ) AND ll.applicant_id = '${this.id}'
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    return !!check.length;
  };

  // eslint-disable-next-line no-unused-vars
  Applicants.beforeCreate(async (i, options) => {
    const check = await sequelize.query(
      `SELECT id 
      FROM applicants 
      WHERE name LIKE "%${i.name}%" 
      OR phone_number = "${i.phone_number}" 
      OR bvn = "${i.bvn}"`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (check.length) {
      throw new CustomError(
        "Applicant with name, phone number or bvn exists, You're advice to search before you proceed"
      );
    }
  });

  return Applicants;
};

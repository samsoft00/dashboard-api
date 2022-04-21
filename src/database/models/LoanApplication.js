const { Model } = require('sequelize');
const { inRange } = require('lodash');
const { default: CustomError } = require('../../utils/CustomError');

module.exports = (sequelize, DataTypes) => {
  class LoanApplication extends Model {
    static associate({
      ApproveAuthority,
      User,
      LoanLogs,
      LoanType,
      LoanState,
      Department, // LoanSteps
      LoanSource,
      Applicants,
      // LoanAppDocuments,
      // LoanAppCheckList,
      CheckList,
      ClientBank,
      LoanAppComment,
      BusinessEmployment,
    }) {
      // define association here
      this.hasMany(ApproveAuthority, {
        foreignKey: { name: 'loan_id', allowNull: false },
        as: 'approve_authority',
      });

      this.hasMany(LoanLogs, {
        foreignKey: { name: 'loan_id', allowNull: false },
        as: 'logs',
      });
      this.hasMany(LoanAppComment, {
        foreignKey: { name: 'loan_id', allowNull: false },
        as: 'comments',
      });
      this.belongsTo(LoanState, { foreignKey: { name: 'current_state_id' }, as: 'current_state' });
      this.belongsTo(Department, { foreignKey: { name: 'current_step_id' }, as: 'current_step' });
      this.belongsTo(LoanType, {
        foreignKey: { name: 'loan_type_id', allowNull: false },
        as: 'loan_type',
      });
      this.belongsTo(Applicants, {
        foreignKey: { name: 'applicant_id', allowNull: false },
        as: 'applicant',
      });
      this.belongsTo(BusinessEmployment, {
        foreignKey: { name: 'business_employment_id' },
        as: 'business_employment',
      });
      // this.belongsTo(LoanDetail, { foreignKey: { name: 'loan_detail_id' }, as: 'loan_detail' });
      this.belongsTo(LoanSource, {
        foreignKey: { name: 'loan_source_id', allowNull: false },
        as: 'loan_source',
      });
      this.belongsTo(ClientBank, {
        foreignKey: { name: 'bank_detail_id', allowNull: false },
        as: 'client_bank',
      });

      this.belongsTo(User, { foreignKey: { name: 'user_id' }, as: 'created_by' });

      this.belongsToMany(CheckList, {
        through: 'LoanAppCheckList',
        as: 'docs',
        foreignKey: { name: 'loan_application_id' },
        // otherKey: { name: 'check_list_id' },
      });
    }
  }
  LoanApplication.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      refrence_no: DataTypes.STRING(50),
      amount: DataTypes.DECIMAL(13, 2),
      monthly_repayment_amount: DataTypes.DECIMAL(13, 2),
      maturity_tenor: DataTypes.STRING(100),
      collateral_offered: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      purpose: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      repayment_frequency: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      },
      repeat_loan: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      // tag: { type: DataTypes.INTEGER },
      require_approval: { type: DataTypes.BOOLEAN },
      registration_status: {
        type: DataTypes.ENUM,
        defaultValue: 'pending',
        values: ['pending', 'completed', 'update_required'],
      },
      // loan_type_id: DataTypes.INTEGER,
      // identification_id: DataTypes.INTEGER,
      // education_id: DataTypes.INTEGER,
      // occupation_id: DataTypes.INTEGER,
      // lga: DataTypes.STRING, // lga_id
      // place_of_birth: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'LoanApplication',
      tableName: 'loans',
      underscored: true,
      // timestamps: false,
      // using default scope
      defaultScope: {
        attributes: {
          exclude: [
            // 'business_employment_id',
            // 'spouse_id',
            // 'loan_source_id',
            'current_state_id',
            'current_step_id',
            'loan_type_id',
            // 'identification_id',
            // 'client_bank_id',
            // 'loan_detail_id',
          ],
        },
      },
    }
  );

  // eslint-disable-next-line no-unused-vars
  // LoanApplication.addHook('beforeCreate', (loan, options) => {
  //   return Object.assign(loan, { repeat_loan: false });
  // });

  LoanApplication.findOrFail = async function findOrFail(loan_id, query) {
    const loan = await this.findOne({
      where: { id: loan_id, ...query },
      include: [
        {
          model: sequelize.models.LoanState,
          as: 'current_state',
          attributes: { exclude: ['order'] },
        },
      ],
    });
    if (!loan) throw new CustomError('Loan Application not found');

    return loan;
  };

  LoanApplication.prototype.isClosed = function isClosed() {
    const FORBIDEN_UPDATE = ['CLOSED', 'REJECTED'];
    return FORBIDEN_UPDATE.includes(this.current_state.slug.toUpperCase());
  };

  LoanApplication.prototype.getDefaultAuthority = function getDefaultAuthority() {
    // 7000000.00
    const approve_authority = [
      {
        amount: 500000.01, // 50,000 - 500,000
        authority: [{ role: 'head_credit', name: 'Head Credit', status: false }],
      },
      {
        amount: 3000000.01, // 500,000 - 3,000,000
        authority: [{ role: 'cco', name: 'Chief Compliance Officer', status: false }],
      },
      {
        amount: 100000000.01, // 3,000,000 - 100,000,000
        authority: [{ role: 'managing_director', name: 'Managing Director', status: false }],
      },
      // {
      //   amount: 50000000.01, // 10,000,000 - 50,000,000
      //   authority: [{ role: 'credit_committee', name: 'Credit Committee', status: false }],
      // },
      // {
      //   amount: 100000000.01, // 50,000,000 - 100,000,000
      //   authority: [
      //     { role: 'managing_director', status: false },
      //     { role: 'board_member', status: false },
      //   ],
      // },
      // {
      //   amount: 100000000.01, // 100,000,000 - up
      //   authority: [
      //     { role: 'managing_director', name: 'Managing Director', status: false },
      //     { role: 'board_member', name: 'Board Member', status: false },
      //     { role: 'board_member', name: 'Board Member', status: false },
      //   ],
      // },
    ];

    return approve_authority.filter((obj) => {
      return inRange(this.amount, obj.amount);
    })[0];
  };

  return LoanApplication;
};

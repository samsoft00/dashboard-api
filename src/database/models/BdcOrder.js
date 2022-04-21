const { Model } = require('sequelize');
const { default: CustomError } = require('../../utils/CustomError');

module.exports = (sequelize, DataTypes) => {
  class BdcOrder extends Model {
    // eslint-disable-next-line no-unused-vars
    static associate({ ActivityLog, User, BdcBankDetail, CurrencyType, Department }) {
      this.hasMany(ActivityLog, {
        foreignKey: { name: 'data', allowNull: true },
        as: 'activity_logs',
      });

      this.belongsTo(CurrencyType, {
        foreignKey: { name: 'currency_type_id' },
        as: 'currency',
      });

      this.belongsTo(BdcBankDetail, {
        foreignKey: { name: 'bdc_bank_detail_id' },
        as: 'bdc_bank',
      });

      this.belongsTo(Department, {
        foreignKey: { name: 'bdc_dept_id' },
        as: 'bdc_dept',
      });

      this.belongsTo(User, { foreignKey: { name: 'user_id' }, as: 'created_by' });
    }
  }
  BdcOrder.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      customer: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      refrence_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['buy', 'sell'],
      },
      currency_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'currency_types',
          },
          key: 'id',
        },
      },
      volume: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      exchange_rate: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      mode_of_payment: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['wire', 'cash', 'wire/cash'],
      },
      cash_payment: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: true,
      },
      bdc_bank_detail_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'bdc_bank_details',
          },
          key: 'id',
        },
      },
      // bdc_company: {
      //   type: DataTypes.STRING(70),
      //   allowNull: false,
      // },
      bdc_dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'department',
          },
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM,
        allowNull: false,
        default: 'completed',
        values: ['pending', 'completed'],
      },
    },
    {
      sequelize,
      modelName: 'BdcOrder',
      tableName: 'bdc_orders',
      underscored: true,
    }
  );

  // eslint-disable-next-line no-unused-vars
  BdcOrder.beforeCreate(async (i, options) => {
    const check = await sequelize.query(
      `
      SELECT * FROM currency_types 
      WHERE id = :curr_id AND locale = :naira
    `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          naira: 'NGN',
          curr_id: i.currency_type_id,
        },
      }
    );
    if (check.length) {
      throw new CustomError("You can't create transaction against NGN");
    }
  });

  return BdcOrder;
};

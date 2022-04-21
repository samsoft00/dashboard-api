/* eslint-disable func-names */
/* eslint-disable object-shorthand */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FxOrder extends Model {
    static associate({
      CurrencyType,
      FxState,
      User,
      Department,
      FxOrderLogs,
      TransactionTypes,
      BankDetail,
      FxOrderComment,
      FxOrderSupportDoc,
    }) {
      this.hasMany(FxOrderLogs, {
        foreignKey: { name: 'fx_order_id', allowNull: false },
        as: 'logs',
      });

      this.hasMany(FxOrderComment, {
        foreignKey: { name: 'fx_order_id', allowNull: false },
        as: 'comments',
      });

      this.hasMany(FxOrderSupportDoc, {
        foreignKey: { name: 'fx_order_id', allowNull: false },
        as: 'support_docs',
      });

      this.belongsTo(CurrencyType, {
        foreignKey: { name: 'currency_from_id' },
        as: 'currency_from',
      });

      this.belongsTo(CurrencyType, {
        foreignKey: { name: 'currency_to_id' },
        as: 'currency_to',
      });

      this.belongsTo(TransactionTypes, {
        foreignKey: { name: 'transaction_type_id' },
        as: 'transaction_type',
      });

      this.belongsTo(FxState, {
        foreignKey: { name: 'current_state_id', allowNull: true, defaultValue: null },
        as: 'current_state',
      });
      this.belongsTo(Department, { foreignKey: { name: 'current_step_id' }, as: 'current_step' });

      this.belongsTo(BankDetail, {
        foreignKey: { name: 'receiving_bank_id' },
        as: 'receiving_bank',
      });

      this.belongsTo(User, { foreignKey: { name: 'user_id' }, as: 'created_by' });
      /*
      this.belongsToMany(PaymentSource, {
        through: 'FxOrderSource',
        as: 'sources',
        onDelete: 'CASCADE',
        foreignKey: { name: 'fx_order_id', allowNull: false },
        hooks: true,
      });

      this.belongsToMany(BankDetail, {
        through: 'FxOrderBeneficiary',
        as: 'beneficiary',
        onDelete: 'CASCADE',
        foreignKey: { name: 'fx_order_id', allowNull: false },
        hooks: true,
      });
      */
    }
  }
  FxOrder.init(
    {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      reference_no: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      invoice_no: {
        allowNull: true,
        unique: true,
        type: DataTypes.STRING(100),
      },
      volume: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
        },
      },
      exchange_rate: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
        },
      },
      total_payment: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
        },
      },
      bank_charges: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
        },
      },
      other_charges: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: true,
        validate: {
          isDecimal: true,
        },
      },
      tranx_purpose: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      invoice_url_path: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['high', 'medium', 'low'],
      },
      customer: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      payment_source: {
        type: DataTypes.TEXT,
        get: function () {
          return JSON.parse(this.getDataValue('payment_source'));
        },
        set: function (v) {
          return this.setDataValue('payment_source', JSON.stringify(v));
        },
      },
      beneficiary_details: {
        type: DataTypes.TEXT,
        get: function () {
          return JSON.parse(this.getDataValue('beneficiary_details'));
        },
        set: function (v) {
          return this.setDataValue('beneficiary_details', JSON.stringify(v));
        },
      },
      kyc_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        validate: {
          notEmpty: true,
        },
      },
      authorize_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      client_approve: {
        type: DataTypes.ENUM,
        allowNull: false,
        values: ['accepted', 'rejected', 'pending'],
      },
      authorize_file_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'FxOrder',
      tableName: 'fx_orders',
      underscored: true,
      paranoid: true,
      defaultScope: {
        attributes: {
          exclude: [
            'currency_from_id',
            'currency_to_id',
            'current_state_id',
            'current_step_id',
            'transaction_type_id',
            'authorize_token',
            'authorize_file_url',
            // 'receiving_bank_id',
          ],
        },
      },
    }
  );
  // FxOrder.prototype.addComment = function addComment(comment, user) {
  //   return new Promise((resolve) => {});
  // };

  return FxOrder;
};

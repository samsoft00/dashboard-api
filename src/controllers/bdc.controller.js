/* eslint-disable radix */
import { pick, isUndefined, merge } from 'lodash';
import assert from 'assert';
import Decimal from 'decimal.js';
import { PythonShell } from 'python-shell';
import Joi, { ValidationError } from '@hapi/joi';
import moment from 'moment';
import config from 'config';
import path from 'path';
import Redis from 'ioredis';
import qs from 'qs';
import { removeSync } from 'fs-extra';

import {
  sequelize,
  BdcOrder,
  Bank,
  BdcStock,
  BdcOrderReport,
  BdcBankDetail,
  Department,
} from '../database/models';
import RespUtil from '../utils/RespUtil';
import Utility from '../utils/Utility';
import Generator from '../utils/Generator';
import Paginate from '../utils/Pagination';
import CustomError from '../utils/CustomError';
import ErrorHandler from '../errors/error.handler';
import ValidatorHelper from '../utils/ValidatorHelper';
import { QueueService } from '../services/queue.service';

const { newPagHandler, isValidHttpUrl, activityLog: Logger } = Utility;
const { validateBdcOrder } = ValidatorHelper;

const util = new RespUtil();
const sendBdcReport = new QueueService('send-bdc-report');
const redisConfig = config.get('redis');

const bankValidtn = {
  bank_id: Joi.number().required().error(new ValidationError('Please select a valid bank name!')),
  account_number: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required()
    .error(new ValidationError('Invalid account number, number must be 10 digits!')),
  account_name: Joi.string().required().error(new ValidationError('Please enter account name!')),
  is_disabled: Joi.boolean().optional(),
};

/**
 * BDC Controller
 */

export default class BdcController {
  // create orders with created by
  /**
   * - Customer name pull from bdc kyc
   * - transaction type
   * - currency_type
   * - volume
   * - rate
   * - mode_of_payment
   *
   * - cash
   *
   * - bank
   * - status
   */
  static async createBdcOrder(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id
    const t = await sequelize.transaction();

    const payload = pick(req.body, [
      'customer',
      'transaction_type',
      'volume',
      'exchange_rate',
      'mode_of_payment',
      'cash_payment',
      'bdc_bank_detail_id',
      'currency_type_id',
      'bdc_dept_id',
      'status',
    ]);

    try {
      // run check if opening and closing balance is created
      await sequelize.query(
        `
          INSERT INTO bdc_stock_balances (bdc_stock_id, opening_balance, bdc_dept_id, closing_balance, created_at, updated_at)
          SELECT
              id AS bdc_stock_id,
              stock_balance AS opening_balance,
              :bdc_dept_id,
              :closing_balance,
              :datetime,
              :datetime FROM (SELECT * FROM bdc_stocks WHERE currency_type_id = :type AND bdc_dept_id = :bdc_dept_id) AS tmp
          WHERE NOT EXISTS (
              SELECT * FROM bdc_stocks sb
              INNER JOIN bdc_stock_balances bb ON sb.id = bb.bdc_stock_id AND sb.currency_type_id = :type
              WHERE (created_at BETWEEN :start AND :end) AND sb.bdc_dept_id = :bdc_dept_id
          ) LIMIT 1;
          `,
        {
          type: sequelize.QueryTypes.INSERT,
          replacements: {
            closing_balance: 0.0,
            datetime: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
            type: payload.currency_type_id,
            start: moment().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            end: moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
            bdc_dept_id: usrDeptId,
          },
          transaction: t,
        }
      );
      
      await validateBdcOrder().validateAsync(payload);
      assert.ok(
        Object.is(payload.bdc_dept_id, usrDeptId),
        `Department mismatch: order department does not correspond to ${user.department.name}`
      );

      // create stock
      const order = await BdcOrder.create(
        {
          refrence_no: `${Generator.randomNumber(6)}`,
          bdc_dept_id: usrDeptId,
          user_id: user.id,
          ...payload,
        },
        { transaction: t }
      );

      // update stock balances
      await sequelize.query(
        `
        UPDATE bdc_stocks sb JOIN bdc_stock_balances bb ON sb.id = bb.bdc_stock_id AND sb.currency_type_id = :type
        SET sb.stock_balance = IF(:transaction_type = 'buy', GREATEST(0, sb.stock_balance + :total), GREATEST(0, sb.stock_balance - :total)), bb.closing_balance = sb.stock_balance
        WHERE (bb.created_at BETWEEN :start AND :end) AND (sb.bdc_dept_id = :bdc_dept_id);
      `,
        {
          type: sequelize.QueryTypes.UPDATE,
          replacements: {
            type: payload.currency_type_id,
            bdc_dept_id: usrDeptId,
            transaction_type: payload.transaction_type.toLowerCase(),
            total: new Decimal(payload.volume).mul(payload.exchange_rate).toFixed(2),
            start: moment().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            end: moment().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
          },
          transaction: t,
        }
      );

      await t.commit();

      Logger(req.headers['x-real-ip'], req.user, 'CREATE_BDC_ORDER', {
        bdc_order_id: order.id,
        bdc_dept_id: usrDeptId
      });
      util.setSuccess(200, 'order created!', order);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      await t.rollback();
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**
   * Return Stock balances
   */
  static async getStockOrderBalance(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id

    try {
      const sb = await sequelize.query(
        `
        SELECT 
            c.name as name, 
            c.locale as locale, 
            s.stock_balance as stock_balance, 
            sb.opening_balance as opening_balance, 
            (case when sb.closing_balance = '0.00' then s.stock_balance else sb.closing_balance end) as closing_balance,
            @volume := COALESCE((
                SELECT SUM(volume) FROM bdc_orders 
                WHERE transaction_type = :sell 
                AND bdc_dept_id = :bdc_dept_id
                AND currency_type_id = c.id
                AND created_at BETWEEN :start AND :end), 0.00) as volume_sold,
            @avg_selling_rate := COALESCE((
                SELECT CAST(AVG(DISTINCT exchange_rate) AS DECIMAL(12,2)) FROM bdc_orders 
                WHERE transaction_type = :sell 
                AND bdc_dept_id = :bdc_dept_id
                AND currency_type_id = c.id 
                AND created_at BETWEEN :start AND :end), 0.00) AS average_selling_rate,
            @avg_purchase_rate := COALESCE((
                SELECT CAST(AVG(DISTINCT exchange_rate) AS DECIMAL(12,2)) FROM bdc_orders 
                WHERE transaction_type = :buy 
                AND bdc_dept_id = :bdc_dept_id
                AND currency_type_id = c.id
                AND created_at BETWEEN :start AND :end), 0.00) AS average_purchase_rate,
            @sprd := CAST(@avg_selling_rate - @avg_purchase_rate AS DECIMAL(12,2)) AS spread,
            CAST(@sprd * @volume AS DECIMAL(12,2)) AS profit,
            sb.created_at as created_at,
            sb.updated_at as updated_at
        FROM currency_types c
        LEFT JOIN bdc_stocks s ON c.id = s.currency_type_id
        LEFT JOIN bdc_stock_balances sb ON s.id = sb.bdc_stock_id
        WHERE (sb.created_at BETWEEN :start AND :end) AND (sb.bdc_dept_id = :bdc_dept_id)
        ORDER BY s.stock_balance DESC
                `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            buy: 'buy',
            sell: 'sell',
            bdc_dept_id: usrDeptId,
            start: moment().startOf('day').format(),
            end: moment().endOf('day').format(),
          },
        }
      );

      util.setSuccess(200, 'successful', sb);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  // Get Orders
  static async getBdcOrders(req, res) {
    const { user } = req;
    const { page, limit, searchqry, dept_id } = qs.parse(req.query);
    

    const currentPage = parseInt(page || 1, 10);
    const defaultLimit = parseInt(limit || 20, 20);

    try {
      const whereQry = {
        ...(![undefined, null, ''].includes(dept_id) && { bdc_dept_id: parseInt(dept_id, 10) }),
        ...(/_BDC/.test(user.department.slug) && { bdc_dept_id: user.department.id }),
        ...(![undefined, null, ''].includes(searchqry) && {
          customer: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('customer')),
            'LIKE',
            `%${searchqry.trim().toLowerCase()}%`
          ),
        }),
        // bdc_dept_id: usrDeptId // parseInt(dept_id, 10)
      };

      // if (!isUndefined(searchqry) && searchqry.trim() !== '') {
      //   merge(whereQry, {
      //     customer: sequelize.where(
      //       sequelize.fn('LOWER', sequelize.col('customer')),
      //       'LIKE',
      //       `%${searchqry.toLowerCase()}%`
      //     ),
      //   });
      // }

      const options = {
        where: whereQry,
        attributes: [
          'id',
          'refrence_no',
          'customer',
          'transaction_type',
          [
            sequelize.literal(`(
            SELECT CONCAT(name, ' (', locale, ')') FROM currency_types 
            WHERE currency_type_id = currency_types.id
        )`),
            'currency',
          ],
          [
            sequelize.literal(`(SELECT name FROM department WHERE bdc_dept_id = department.id)`),
            'bdc_dept',
          ],
          'volume',
          'exchange_rate',
          'mode_of_payment',
          'status',
          'created_at',
          'updated_at',
        ],
      };

      const orders = await BdcOrder.findAndCountAll(options);

      util.setPagination(new Paginate(orders, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', orders);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  // Get Order by ID data.bdc_order_id
  static async getBdcOrderById(req, res) {
    try {
      // '$activity_logs.action$': { $eq: 'CREATE_BDC_ORDER' }
      const response = await BdcOrder.findOne({
        where: { id: req.params.id },
        attributes: [
          'id',
          'refrence_no',
          'customer',
          'transaction_type',
          [
            sequelize.literal(
              `(SELECT CONCAT(c.name, ' (', c.locale, ')') FROM currency_types c WHERE c.id = currency_type_id )`
            ),
            'currency',
          ],
          [
            sequelize.literal(`CASE WHEN transaction_type = 'buy' THEN volume ELSE NULL END`),
            'volume_purchased',
          ],
          [
            sequelize.literal(`CASE WHEN transaction_type = 'sell' THEN volume ELSE NULL END`),
            'volume_sold',
          ],
          'exchange_rate',
          [
            sequelize.literal(`
            case 
                when transaction_type = 'buy' 
                then CAST(volume * exchange_rate AS DECIMAL(12,2)) else NULL 
            end        
          `),
            'total_amount_purchased',
          ],
          [
            sequelize.literal(`
          case 
              when transaction_type = 'sell' 
              then CAST(volume * exchange_rate AS DECIMAL(12,2)) else NULL 
          end        
        `),
            'total_amount_sold',
          ],
          [
            sequelize.literal(`case when transaction_type = 'buy' then cash_payment else NULL end`),
            'cash_paid',
          ],
          [
            sequelize.literal(
              `case when transaction_type = 'sell' then cash_payment else NULL end`
            ),
            'cash_recieved',
          ],
          'bdc_dept_id',
          'mode_of_payment',
          [
            sequelize.literal(
              `(SELECT CONCAT(u.fullname, ' (', d.name, ')') FROM user u 
              INNER JOIN department d ON u.department_id = d.id WHERE u.id = user_id)`
            ),
            'created_by',
          ],
          'status',
          'created_at',
        ],
        include: [
          /* {
            model: ActivityLog,
            as: 'activity_logs',
            attributes: [
              'id',
              [
                sequelize.literal(
                  `(SELECT fullname FROM user u WHERE u.id = activity_logs.user_id)`
                ),
                'user',
              ],
              [sequelize.literal(`REPLACE(activity_logs.action, '_', ' ')`), 'action'],
              'created_at',
            ],
          }, */
          {
            model: BdcBankDetail,
            as: 'bdc_bank',
            attributes: [
              [
                sequelize.literal(`(SELECT name FROM banks WHERE banks.id = bdc_bank.bank_id)`),
                'bank_name',
              ],
              'account_number',
              'account_name',
            ],
          },
          {
            model: Department,
            as: 'bdc_dept',
          },
        ],
      });

      if (!response) {
        throw new CustomError(`Oops! Order with ID ${req.params.id} not found!`, 404);
      }

      util.setSuccess(200, 'successful', response);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**----------------------
   * BDC Generate reports
   * ----------------------
   */
  static async generateDailyReport(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id

    const redis = new Redis(redisConfig);
    const today = moment(Date.now()).format('DD-MM-YYYY');
    const rdxPfix = `bdc:report:${user.department.slug.toLowerCase()}:${today.replace(/[^A-Za-z0-9]/g, '')}`;

    try {
      // check if user already make request
      const ex = await redis.get(rdxPfix);
      if (ex) {
        return res.status(201).json({
          status: true,
          message:
            "Request already initiated, we're currently processing your request, kindly wait... ",
        });
      }

      const { host, name, username, password } = config.get('database');
      const { pythonPath } = config.get('general.pythonPath');

      const script_path = path.join(__dirname, '../../scripts');
      const template_file = path.join(
        __dirname,
        '../../scripts/template',
        'bdc_report_prototype.xlsx'
      );
      const file_name = path.join(
        __dirname,
        '../../scripts/reports',
        `bdc-report-${today.replace(/[^A-Za-z0-9]/g, '')}.xlsx`
      );

      const options = {
        mode: 'text',
        pythonPath,
        pythonOptions: ['-u'], // get print results in real-time
        scriptPath: script_path,
        args: [host, name, username, password, template_file, file_name, usrDeptId],
      };

      const r = await (() =>
        new Promise((resolve, reject) => {
          redis.set(rdxPfix, 1, 'EX', 60 * 5);

          return PythonShell.run('bdc.report.py', options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        }))();

      // check if r[0] is url, split error if not
      if (!isValidHttpUrl(r[0])) throw new CustomError(r[0]);

      // create or update
      await sequelize.query(
        `
        INSERT INTO bdc_order_reports (file_path, bdc_dept_id, generated_by, generated_at) 
        VALUES(:file_path, :bdc_dept_id, :generated_by, :generated_at) 
        ON DUPLICATE KEY UPDATE file_path=:file_path, generated_by=:generated_by
          `,
        {
          // type: sequelize.QueryTypes.INSERT,
          replacements: {
            file_path: r[0],
            generated_by: user.id,
            bdc_dept_id: usrDeptId,
            generated_at: moment(Date.now()).format('YYYY-MM-DD'),
          },
        }
      );

      // remove file
      removeSync(file_name);

      // send mail with link ~ send-bdc-report
      await sendBdcReport.topic('send-report').publish({
        download_link: r[0],
        user,
        report_date: today,
      });

      util.setSuccess(200, 'Request initiated, kindly check your email to download report.', {});
      return util.send(res);
    } catch (e) {
      await redis.del(rdxPfix);

      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  // Download existing reports with pagination
  static async downloadReports(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id

    const currentPage = parseInt(req.query.page) || 1;
    const defaultLimit = parseInt(req.query.limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'generated_at');

    // list all report with date.
    try {
      const reports = await BdcOrderReport.findAndCountAll({
        where: { bdc_dept_id: usrDeptId },
        attributes: [
          'id',
          'file_path',
          [
            sequelize.literal(
              `(SELECT CONCAT(u.fullname, ' (', d.name, ')')  
              FROM user u INNER JOIN department d ON u.department_id = d.id 
              WHERE u.id = generated_by)`
            ),
            'generated_by',
          ],
          'generated_at',
        ],
        ...pagOptns,
      });

      util.setPagination(new Paginate(reports, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', reports.rows);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**--------------
   * Stock balance
   * --------------
   */
  static async getStockBalance(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id

    try {
      const stocks = await sequelize.query(
        `
        SELECT 
          s.id as id, 
          stock_balance, 
          name, 
          locale 
        FROM bdc_stocks s
        INNER JOIN currency_types c 
        ON s.currency_type_id = c.id AND s.bdc_dept_id = :bdc_dept_id
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { bdc_dept_id: usrDeptId }
        }
      );

      util.setSuccess(200, 'successful', stocks);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateStocks(req, res) {
    const { user } = req;
    const stockId = req.params.id;
    const usrDeptId = user.department.id

    try {
      const payload = pick(req.body, ['stock_balance']);
      const schema = Joi.object({
        stock_balance: Joi.number()
          .strict()
          .required()
          .error(new ValidationError('kindly provide stock balance, balance must be number')),
      });

      await schema.validateAsync(payload);

      // find stock
      const stock = await BdcStock.findOne({ where: { id: stockId, bdc_dept_id: usrDeptId } });
      if (!stock) throw new CustomError(`Stock balance with ID ${stockId} not found`);

      const current_stock = new Decimal(stock.stock_balance);

      // update stock and stock balances
      await sequelize.query(
        `
        UPDATE bdc_stocks sb JOIN bdc_stock_balances bb ON sb.id = bb.bdc_stock_id
        SET sb.stock_balance = :stock_balance, bb.opening_balance = sb.stock_balance
        WHERE sb.id = :stock_id
      `,
        {
          type: sequelize.QueryTypes.UPDATE,
          replacements: {
            stock_id: stock.id,
            stock_balance: current_stock.add(payload.stock_balance).toFixed(2),
          },
        }
      );

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  /**-----------------
   * BDC Bank Detail
   * -----------------
   */

  static async getBdcBankDetails(req, res) {
    const { user } = req;
    const usrDeptId = user.department.id

    const currentPage = parseInt(req.query.page) || 1;
    const defaultLimit = parseInt(req.query.limit) || 20;
    const pagOptns = newPagHandler(currentPage, defaultLimit, 'created_at');

    try {
      const options = {
        where: { bdc_dept_id: usrDeptId },
        include: [
          {
            model: Bank,
            as: 'bank',
            attributes: ['id', 'name'],
          },
        ],
        ...pagOptns,
      };

      const b = await BdcBankDetail.findAndCountAll(options);

      util.setPagination(new Paginate(b, currentPage, defaultLimit));
      util.setSuccess(200, 'successful', b.rows);

      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async getBdctBankDetailByID(req, res) {
    try {
      const b = await BdcBankDetail.findOne({
        where: { id: req.params.id },
        include: [
          {
            model: Bank,
            as: 'bank',
            attributes: ['id', 'name'],
          },
        ],
      });
      if (!b) throw new CustomError(`BDC bank detail not found`);

      util.setSuccess(200, 'successful', b);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async addBankDetail(req, res) {
    const { user } = req;

    try {
      const payload = pick(req.body, ['bank_id', 'account_number', 'account_name', 'is_disabled']);

      const schema = Joi.object(bankValidtn);
      schema.validateAsync(payload);

      // create
      const r = await BdcBankDetail.create({
        bdc_dept_id: user.department.id,
        ...payload
      });

      util.setSuccess(200, 'successful', r);
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }

  static async updateBankDetail(req, res) {
    const { user } = req

    try {
      const payload = pick(req.body, ['bank_id', 'account_number', 'account_name', 'is_disabled']);

      const schema = Joi.object(bankValidtn);
      schema.validateAsync(payload);

      const b = await BdcBankDetail.findOne({ 
        where: { id: req.params.id, bdc_dept_id: user.department.id } 
      });
      if (!b) throw new CustomError(`BDC bank detail not found`);

      await b.update(payload);

      util.setSuccess(200, 'successful', {});
      return util.send(res);
    } catch (e) {
      const error = new ErrorHandler(e);
      return util.setError(error.statusCode, error.message).send(res);
    }
  }
}

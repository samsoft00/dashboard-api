import config from 'config';
import moment from 'moment';
import { Queue } from 'bullmq';
import { QueryTypes } from 'sequelize';
import Bugsnag from '@bugsnag/js';
import {
  sequelize,
  FxState,
  LoanState,
  CurrencyType,
  LoanApplication,
  Department,
  User,
} from '../database/models';
import { QueueService } from '../services/queue.service';

// const redisConfig = config.get('redis');
const { scheduler_token } = config.get('gcp');

const loanEscalateQueue = new QueueService('loan-escalatn-queue');
const fxEscalateQueue = new QueueService('fx-escalatn-queue');
const loanQueue = new QueueService('loan-queue');

/**
 * Handle webhook related activities
 */
export default class WebhookController {
  /**
   * This method track & monitor
   * Fx Order process timeline, and
   * escalate if beyond specific time (3hours)
   */
  // TODO: streamline this
  static async trackFxTimeline(req, res) {
    const { request_token } = req.query;
    try {
      if (request_token !== scheduler_token) return res.status(400).json();
      const stateToIqnore = ['CLOSED'];

      const states = await FxState.findAll();
      const intersection = new Set(states.filter((s) => !stateToIqnore.includes(s.slug)));
      const IN = `'${Array.from(intersection)
        .map((i) => i.slug)
        .join("','")}'`;

      const orders = await sequelize.query(
        `
        SELECT 
          fx.id, 
          fx.reference_no, 
          fx.created_at, 
          fs.slug as slug, 
          (
            SELECT ll.timeline 
            FROM fx_order_logs ll 
            WHERE ll.fx_order_id = fx.id
            ORDER BY ll.id DESC LIMIT 1
          ) AS timeline
        FROM fx_orders fx 
        LEFT JOIN fx_states fs ON fx.current_state_id = fs.id
        WHERE slug IN (${IN})
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)        
        `,
        { type: QueryTypes.SELECT }
      );

      const o = orders.filter(
        (order) => order.timeline && moment(order.timeline).valueOf() < moment().valueOf()
      );
      if (!o.length) return res.json();

      await fxEscalateQueue.topic('fxEscalation').publish({ orders: o.map((x) => x.id) });
      // await fxEscalateQueue.add('fxEscalation', { orders: o.map((x) => x.id) }, { attempts: 2 });
      return res.json();
    } catch (error) {
      Bugsnag.notify(error);
      res.status(400).json({ message: error.message });
    }
  }

  static async trackLoanTimeline(req, res) {
    const { request_token } = req.query;

    try {
      if (request_token !== scheduler_token) throw new Error('Wrong webhook request token');
      // Get all status
      const stateToIqnore = ['REJECTED', 'CLOSED'];

      const states = await LoanState.findAll();
      const intersection = states.filter((s) => !stateToIqnore.includes(s.slug));
      const IN = `'${intersection.map((i) => i.slug).join("','")}'`;

      const loans = await sequelize.query(
        `        
        SELECT 
          l.id, 
          l.refrence_no, 
          l.created_at,
          l.registration_status,
          ls.slug AS slug,
          (
            SELECT ll.timeline 
            FROM loan_logs ll 
            WHERE ll.loan_id = l.id
            ORDER BY ll.id DESC LIMIT 1
          ) AS timeline          
        FROM loans l 
        LEFT JOIN loan_states ls ON l.current_state_id = ls.id
        WHERE slug IN (${IN})
        AND registration_status IN ('completed', 'update_required')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        `,
        { type: QueryTypes.SELECT }
      );

      const ll = loans.filter(
        (loan) => loan.timeline && moment(loan.timeline).valueOf() < moment().valueOf()
      );
      if (!ll.length) return res.json();

      await loanEscalateQueue.topic('loanEscalation').publish({ loans: ll.map((l) => l.id) });

      return res.json();
    } catch (error) {
      Bugsnag.notify(error);
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update Daily Stocks balance
   * RUN: 12:01AM every day.
   */
  static async updateDailyStocks(req, res) {
    const { request_token } = req.query;
    try {
      if (request_token !== scheduler_token) throw new Error('Wrong webhook request token');

      // Get all currency
      const curTypes = await CurrencyType.findAll();
      
      // Get all dept
      let bdcDepts = await Department.findAll();
      bdcDepts = bdcDepts.filter(d => /_BDC/.test(d.slug))

      const loaders = []

      for(const dept of bdcDepts) {

        for (const currency of curTypes) {
          // eachAsync(cur, async (currency) => { <= this will run in parallel
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
                datetime: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                type: currency.id,
                start: moment(Date.now()).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
                end: moment(Date.now()).endOf('day').format('YYYY-MM-DD HH:mm:ss'),
                bdc_dept_id: dept.id,
              },
            }
          );
          // });
        }        

      }

      return res.status(200).json({});
    } catch (error) {
      Bugsnag.notify(error);
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Run every 1hours
   * This method remove existing loan from AUDIT
   */
  static async autoMoveLoanFromAudit(req, res) {
    return res.status(200).json({});

    try {
      const state = await LoanState.findOne({ where: { slug: 'AUDIT' } });
      const dept = await Department.findOne({ where: { slug: 'AUDIT' } });
      const auditGuy = await User.findAll({ where: { department_id: dept.id } });

      const options = {
        where: {
          '$current_state.id$': { $eq: state.id },
          '$current_step.id$': { $eq: dept.id },
        },
        include: [
          { model: LoanState, as: 'current_state', required: true },
          { model: Department, as: 'current_step', required: true },
        ],
      };

      const loanInAudit = await LoanApplication.findAndCountAll(options);
      const loansQ = [];

      for (const loan of loanInAudit.rows) {
        loansQ.push(
          loanQueue.topic('move-loan-audit').publish({ loan: loan, user_id: auditGuy[0].id })
        );
      }

      await Promise.resolve(loansQ);
      return res.status(200).json({});
    } catch (error) {
      Bugsnag.notify(error);

      res.status(400).json({ message: error.message });
    }
  }
}

/**
 * select id, title, approved, (select ls.state from loan_states ls where ls.loan_id = l.id order by ls.id desc limit 1) from loan l where registration_status = 'completed'
 */

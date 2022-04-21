/* eslint-disable no-async-promise-executor */
/* eslint-disable prefer-destructuring */
import axios from 'axios';
import { merge, isNumber } from 'lodash';
import { FxState, FxOrder, Department, TransactionTypes } from '../database/models';
import CustomError from '../utils/CustomError';

axios.defaults.headers.post['Content-Type'] = 'application/json';

export default class FxService {
  static async fxNextLevel(fx) {
    return new Promise(async (resolve, reject) => {
      try {
        const dept = await Department.findAll({ order: [['loan_process_order', 'ASC']] });
        const fxState = await FxState.findAll();

        const currentState = fx.current_state;
        // const currentStep = fx.current_step;

        let nextState;
        let nextSteps;

        switch (currentState.slug) {
          case 'NEW':
            nextState = 'INTERNAL_CONTROL';
            nextSteps = 'INTERNAL_CONTROL';
            break;

          case 'INTERNAL_CONTROL':
            nextState = 'FINANCE';
            nextSteps = 'FINANCE';
            break;

          case 'FINANCE':
            nextState = 'PROCESSED';
            nextSteps = 'FINANCE';
            break;

          default:
            throw new Error(`Fx order with Order No: ${fx.order_no}, already closed!`);
        }

        if (!isNumber(nextSteps)) {
          nextSteps = dept.filter((d) => d.slug === nextSteps)[0];
        } else {
          nextSteps = dept.filter((d) => d.loan_process_order === nextSteps)[0];
        }

        if (!isNumber(nextState)) {
          nextState = fxState.filter((s) => s.slug === nextState)[0];
        } else {
          nextState = fxState.filter((s) => s.order === nextState)[0];
        }

        return resolve({ next_state: nextState, next_step: nextSteps });
      } catch (error) {
        return reject(error);
      }
    });
  }

  static async getFxStateByDept(dept) {
    const whereQry = {};

    switch (dept.slug) {
      // case 'NEW':
      //   merge(whereQry, { slug: 'RELATION_OFFICER' });
      //   break;
      case 'INTERNAL_CONTROL':
        merge(whereQry, { slug: 'INTERNAL_CONTROL' });
        break;
      case 'FINANCE':
        merge(whereQry, { slug: 'FINANCE' });
        break;
      default:
        merge(whereQry, { slug: 'NONE' }); // Loan officer
        break;
    }

    return FxState.findOne({ where: whereQry });
  }

  static async findOrFail(fx_order_id, query = {}) {
    const fxOrder = await FxOrder.findOne({
      where: { id: fx_order_id, ...query },
      include: [{ model: TransactionTypes, as: 'transaction_type' }], // default include
    });

    if (!fxOrder) throw new CustomError(`Fx Order with ID ${fx_order_id} not found!`, 404);
    return fxOrder;
  }

  static async request(token, url, method, data) {
    return new Promise((resolve, reject) => {
      try {
        axios({
          method,
          url,
          data,
          headers: { Authorization: token },
        })
          .then((res) => {
            resolve(res);
          })
          .catch((err) => {
            // eslint-disable-next-line prefer-const
            let { status, message } = err.response.data
              ? err.response.data
              : { message: err.message, status_code: 400 };

            if (status === 'error') {
              message = 'Customer record not found!';
            }

            reject(new Error(message));
          });
      } catch (error) {
        reject(new Error(error.message));
      }
    });
  }

  static getCustomerData(data) {
    const { customer } = data.message;

    return {
      id: customer.id,
      name: customer.fullname,
      address: customer.address,
      email: customer.email,
      phone: customer.phone,
    };
  }
}

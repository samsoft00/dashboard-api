import { LoanState, Department } from '../database/models';
import FlowIterator from './FlowIterator';

/**
 * Doubly linked list for
 * Loan steps and flow
 */
export default class LoanFlow {
  constructor(loan) {
    this.loan = loan;
    this.items = [];
  }

  getOrders() {
    return this.loan;
  }

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.length;
  }

  addItem(item) {
    this.items.push(item);
  }

  loadFlows(items) {
    if (!Array.isArray(items)) {
      this.addItem(items);
      return this;
    }

    // eslint-disable-next-line no-unused-vars
    items.map((item, _) => this.addItem(item));
  }

  async getIterator() {
    const steps = await Department.findAll({ order: [['loan_process_order', 'ASC']] });
    const states = await LoanState.findAll();

    return new FlowIterator(this, steps, states);
  }
}

/* eslint-disable guard-for-in */
/* eslint-disable max-classes-per-file */
import { FxState, Department } from '../database/models';
import FlowIterator from './FlowIterator';

export default class FxFlow {
  constructor(fxOrder) {
    this.orders = fxOrder;
    this.items = [];
  }

  getOrders() {
    return this.orders;
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
    const states = await FxState.findAll();

    return new FlowIterator(this, steps, states);
  }
}

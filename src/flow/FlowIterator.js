import { findIndex } from 'lodash';

/**
 * Flow Iterator
 */
export default class FlowIterator {
  constructor(collection, steps, states) {
    this.collection = collection;
    this.steps = steps;
    this.states = states;

    if (collection.getOrders()) {
      const currentStep = collection.getOrders().current_step;
      this.position = collection.getItems().findIndex((x) => x.step === currentStep.slug);
    } else {
      this.position = 0;
    }
  }

  key() {
    return this.position;
  }

  current() {
    // return current state and step
    const cs = this.collection.getItems()[this.position];
    return this.payload(cs);
  }

  goto(state) {
    const position = findIndex(this.collection.getItems(), ['state', state]);
    if (!position) throw new Error('Loan position not found!');

    const item = this.collection.getItems()[position];
    return this.payload(item);
  }

  next() {
    this.position += 1;

    const item = this.collection.getItems()[this.position];
    return item ? this.payload(item) : {};
  }

  payload(item) {
    return {
      next_state: this.states.filter((s) => s.slug === item.state.toUpperCase())[0],
      next_step: this.steps.filter((d) => d.slug === item.step.toUpperCase())[0],
      collection: item,
    };
  }

  valid() {
    return this.position < this.collection.getCount() - 1;
  }
}

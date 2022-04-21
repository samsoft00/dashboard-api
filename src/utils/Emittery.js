const { EventEmitter2 } = require('eventemitter2');

const eventEmitter = new EventEmitter2();

const DashboardEmitter = {
  emit(event) {
    eventEmitter.emit(`dashboard:${event.type}`, event.payload);
  },
  addListener(eventType, listener) {
    eventEmitter.addListener(`dashboard:${eventType}`, listener);
  },
};

export default DashboardEmitter;

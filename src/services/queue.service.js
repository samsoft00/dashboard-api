import { Queue } from 'bullmq';
import config from 'config';
import Redis from 'ioredis';

const redisConfig = config.get('redis');
const QUEUE_MAX_ATTEMPTS = 3;

/**
 * Initiate
 * Queue
 * Add
 */
export class QueueService {
  serviceName;
  qOptions;
  name;

  constructor(serviceName) {
    this.serviceName = serviceName;
    this.qOptions = {
      attempts: QUEUE_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    };

    this.redisOpts = { maxRetriesPerRequest: null, enableReadyCheck: false };

    process.on('SIGTERM', this.closeQueue);
    process.setMaxListeners(0);
  }

  topic(name) {
    this.queue = new Queue(this.serviceName, {
      connection: new Redis(redisConfig, this.redisOpts),
    });

    this.name = name;
    return this;
  }

  async publish(payload) {
    return this.queue.add(this.name, payload, this.qOptions);
  }

  closeQueue() {
    this.queue.close();
  }
}

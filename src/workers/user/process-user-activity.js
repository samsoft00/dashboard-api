import config from 'config';
import Bugsnag from '@bugsnag/js';
import { ActivityLog } from '../../database/models';

Bugsnag.start({
  apiKey: config.get('general.bugsnag'),
  appType: 'worker',
});

/**
 * Process user activities
 * @param {*} job
 */
module.exports = async (job) => {
  const { ip, user, action, data } = job.data;
  try {
    if (user && 'id' in user) {
      await ActivityLog.create({ ip, user_id: user.id, action, data });
    }

    return Promise.resolve();
  } catch (e) {
    Bugsnag.notify(e);
  }
};

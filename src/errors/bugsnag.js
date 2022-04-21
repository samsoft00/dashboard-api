import config from 'config';
import Bugsnag from '@bugsnag/js';

Bugsnag.start({
  apiKey: config.get('general.bugsnag'),
  appType: 'worker',
});

export default (e) => {
  Bugsnag.notify(e);
};

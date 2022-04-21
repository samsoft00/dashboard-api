const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) throw err;

  setTimeout(function worker() {
    console.log('Restarting app...');
    pm2.restart('dashboard-api-v1', () => {});
    setTimeout(worker, 3600000);
  }, 3600000);
});

require('dotenv').config({ verbose: true });

const PASSWORD_RESET_EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 1; // 1hours
// const EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 7; // 24; // 24hours
const REFRESH_EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

module.exports = {
  general: {
    env: process.env.NODE_ENV,
    apiUrl: process.env.DASHBOARD_BASE_URL,
    fontendUrl: process.env.DASHBOARD_FRONTEND_URL,
    mailTransport: process.env.DASHBOARD_MAIL_TRANSPORT || 'gmail', // default to sendgrid
    port: process.env.DASHBOARD_PORT || 3000,
    maxUploadFileSize: process.env.DASHBOARD_MAX_UPLOAD_SIZE || 5 * 1024 * 1024, // 50MB,
    fileUploadUrl: process.env.FILE_UPLOAD_URL,
    storageProvider: 'local',
    bugsnag: process.env.BUGSNAG_API_KEY,
    pythonPath: process.env.PYTHON_PATH,
  },
  database: {
    host: process.env.DASHBOARD_VOID_DB_HOST,
    port: process.env.DASHBOARD_VOID_DB_PORT,
    username: process.env.DASHBOARD_VOID_DB_USER,
    password: process.env.DASHBOARD_VOID_DB_PASS,
    name: process.env.DASHBOARD_VOID_DB_NAME,
  },
  auth: {
    secret: process.env.DASHBOARD_ACCESS_TOKEN_SECRET,
    refreshSecret: process.env.DASHBOARD_REFRESH_SECRET,
    signOptions: { expiresIn: '7h', refreshExpIn: REFRESH_EXP },
    resetPasswordExp: PASSWORD_RESET_EXP,
  },
  redis: process.env.REDIS_URL,
  slack: {
    token: process.env.SLACK_TOKEN,
    channelId: process.env.SLACK_NOTIFICATIONS_CHANNEL_FX,
    channelLoan: process.env.SLACK_NOTIFICATIONS_CHANNEL_LOAN,
  },
  gcp: {
    scheduler_token: process.env.CLOUD_SCHEDULER_REQUEST_ID,
    email_broadcast_topic: process.env.EMAIL_BROADCAST_TOPIC,
  },
  api: {
    customer_api: process.env.DASHBOARD_INFLOW_CUSTOMER_ENDPOINT,
  },
  credequity: {
    bearer_token: process.env.DASHBOARD_CREDEQUITY_TOKEN,
    midi_api: process.env.DASHBOARD_CREDEQUITY_MIDI_API,
    credit_check_api: process.env.DASHBOARD_CREDEQUITY_CREDIT_API,
  },
};

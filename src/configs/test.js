require('dotenv').config({ verbose: true });

const PASSWORD_RESET_EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 1; // 1hours
const EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24hours
const REFRESH_EXP = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

module.exports = {
  general: {
    env: 'test',
    apiUrl: process.env.DASHBOARD_BASE_URL,
    fontendUrl: process.env.DASHBOARD_FRONTEND_URL,
    mailTransport: process.env.DASHBOARD_MAIL_TRANSPORT || 'gmail', // default to sendgrid
    port: process.env.DASHBOARD_PORT || 3000,
    maxUploadFileSize: process.env.DASHBOARD_MAX_UPLOAD_SIZE || 10 * 1024 * 1024, // 100MB,
    fileUploadUrl: process.env.FILE_UPLOAD_URL,
    storageProvider: 'local',
  },
  database: {
    host: process.env.DASHBOARD_VOID_DB_HOST || process.env.MYSQL_HOST,
    port: process.env.DASHBOARD_VOID_DB_PORT,
    username: process.env.DASHBOARD_VOID_DB_USER || process.env.MYSQL_USER,
    password: process.env.DASHBOARD_VOID_DB_PASS || process.env.MYSQL_PASSWORD,
    name: process.env.DASHBOARD_VOID_DB_NAME || process.env.MYSQL_DATABASE,
  },
  redis: process.env.REDIS_TEST_URL,
  auth: {
    secret: process.env.DASHBOARD_ACCESS_TOKEN_SECRET,
    refreshSecret: process.env.DASHBOARD_REFRESH_SECRET,
    signOptions: { expiresIn: EXP, refreshExpIn: REFRESH_EXP },
    resetPasswordExp: PASSWORD_RESET_EXP,
  },
  mail: {
    apiKey: process.env.DASHBOARD_SENDGRID_API_KEY,
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

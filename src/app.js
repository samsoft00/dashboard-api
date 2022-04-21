import '@babel/polyfill';
import express from 'express';
import log from 'fancy-log';
import compression from 'compression';
import helmet from 'helmet';
import logger from 'morgan';
import xxs from 'xss-clean';
import passport from 'passport';
import cors from 'cors';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginExpress from '@bugsnag/plugin-express';
import appRouter from './routes';
import './services/event.service';

const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  credentials: true,
  origin: true, // ['*', 'http://localhost:4200'],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

const config = { title: 'Dashboard Status', path: '/status' };

Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY,
  plugins: [BugsnagPluginExpress],
  appType: 'dashboard-api',
  logger: null,
});

const Bsmiddleware = Bugsnag.getPlugin('express');

const app = express();
app.use(require('express-status-monitor')(config));

require('./utils/PassportAuth');

app.use(cors(corsOptions));
app.use(compression());
app.use(helmet());
app.use(xxs());

// Ensure client IP address is included
app.use((req, res, next) => {
  const ip = req.headers['x-real-ip'];
  const result =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ip
    );
  if (result) return next();
  if (/\/webhooks\//.test(req.originalUrl)) return next();

  return res
    .status(400)
    .json({ status: false, message: 'Please include valid IP address in the header.' });
});
app.use(passport.initialize());

app.use(logger('dev'));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

app.use(appRouter);

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Resource does not exist');
  err.status = 404;
  next(err);
});

if (!isProduction) {
  app.use((err, req, res) => {
    log(err.stack);

    res.status(err.status || 500).json({
      message: err.message,
      status: false,
    });
  });
}

app.use((err, req, res) => {
  return res.status(err.status || 500).json({ message: err.message, status: false });
});

// bugsnag
if (['production', 'development'].includes(process.env.NODE_ENV)) {
  app.use(Bsmiddleware.requestHandler);
}

module.exports = app;

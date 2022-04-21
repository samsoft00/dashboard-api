#!/usr/bin/env node

/**
 * Module dependencies.
 */
import expressMonitor from 'express-status-monitor';
import config from 'config';
import { isNaN } from 'lodash';
import log from 'fancy-log';
import Debug from 'debug';
import http from 'http';

import app from './app';

const { port } = config.get('general');
const debug = Debug('dashboard-api:server');

/**
 * Normalize a port into a number, string, or false.
 */

const normalizePort = (val) => {
  const serverPort = parseInt(val, 10);

  if (isNaN(serverPort)) {
    // named pipe
    return val;
  }

  if (serverPort >= 0) {
    // port number
    return serverPort;
  }

  return false;
};

/**
 * Get port from environment and store in Express.
 */

const serverPort = normalizePort(port || '3115');
app.set('port', serverPort);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Event listener for HTTP server "error" event.
 */

const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof serverPort === 'string' ? `Pipe ${serverPort}` : `Port ${serverPort}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      log.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      log.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

/**
 * Event listener for HTTP server "listening" event.
 */

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;

  log.info(`Listening on ${bind}`);
  debug(`Listening on ${bind}`);
};

/**
 * Listen on provided port, on all network interfaces.
 */

app.use(expressMonitor());
server.listen(serverPort);
server.on('error', onError);
server.on('listening', onListening);

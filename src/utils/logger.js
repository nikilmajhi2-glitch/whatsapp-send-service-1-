const pino = require('pino');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = pino({
  level: config.logging.level,
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        },
        level: 'info'
      },
      {
        target: 'pino/file',
        options: { destination: config.logging.file },
        level: 'info'
      }
    ]
  }
});

module.exports = logger;

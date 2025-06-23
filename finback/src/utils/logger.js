const winston = require('winston');
const { format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

// Custom log format with transaction support
const logFormat = printf(({ level, message, timestamp, transactionId, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}] ${transactionId ? `[TX:${transactionId}]` : ''} ${message} ${metaString}`;
});


// Main logger instance
const logger = winston.createLogger({
  levels: winston.config.syslog.levels, // Includes all standard levels
  level: process.env.LOG_LEVEL || 'debug', // Now supports debug level
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ 
      filename: 'logs/errors.log', 
      level: 'error',
      format: format.uncolorize() 
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      format: format.uncolorize()
    })
  ],
  exceptionHandlers: [
    new transports.File({ 
      filename: 'logs/exceptions.log',
      format: format.uncolorize() 
    })
  ]
});

// Enhanced transaction-aware logger proxy
logger.withTransaction = (transactionId) => {
  return new Proxy(logger, {
    get(target, level) {
      const actualLevel = level === 'warn' ? 'warning' : level;

      if (typeof target[actualLevel] === 'function') {
        return (message, meta) => {
          const context = {
            ...meta,
            transactionId
          };
          return target[actualLevel](message, context);
        };
      }
      return target[actualLevel];
    }
  });
};


// Add stream for Express morgan integration
logger.stream = {
  write: (message) => logger.info(message.trim())
};

module.exports = logger;
import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = process.env.LOG_FILE_PATH || 'logs';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.align(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// Production format (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
);

// Create transports array based on environment
const transports: winston.transport[] = [];

// Console transport
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: productionFormat,
      level: 'info'
    })
  );
}

// Daily rotate file transport for all logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: productionFormat,
    level: process.env.LOG_LEVEL || 'info'
  })
);

// Daily rotate file transport for errors
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: productionFormat,
    level: 'error'
  })
);

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'techfolks-backend',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'localhost'
  },
  transports
});

// Add exception handling
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'exceptions.log'),
    format: productionFormat
  })
);

// Add rejection handling
logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'rejections.log'),
    format: productionFormat
  })
);

// Create specialized loggers for different components
export const dbLogger = logger.child({ component: 'database' });
export const authLogger = logger.child({ component: 'authentication' });
export const submissionLogger = logger.child({ component: 'submissions' });
export const queueLogger = logger.child({ component: 'queue' });
export const wsLogger = logger.child({ component: 'websocket' });

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Log uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export utility functions
export const logRequest = (req: any, additionalData?: any) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
    ...additionalData
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    ...metadata
  });
};
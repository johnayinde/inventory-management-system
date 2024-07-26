import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const transports = {
  console: new winston.transports.Console({
    level: 'silly',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.colorize({
        all: true,
        colors: {
          info: 'blue',
          debug: 'yellow',
          error: 'red',
        },
      }),
      winston.format.printf((info) => {
        return `${info.timestamp} [${info.level}] [${
          info.context ? info.context : info.stack
        }] ${info.message}`;
      }),
    ),
  }),
  combinedFile: new winston.transports.File({
    dirname: 'logs',
    filename: 'combined.log',
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 1, // Keep a single combined log file
  }),
  errorFile: new winston.transports.File({
    dirname: 'logs',
    filename: 'error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 1, // Keep a single error log file
  }),
};

const getTransports = (): winston.transport | winston.transport[] => {
  if (process.env.NODE_ENV === 'production') {
    return [transports.console, transports.errorFile, transports.combinedFile];
  }
  return transports.console;
};

export const logger = WinstonModule.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  transports: getTransports(),
});

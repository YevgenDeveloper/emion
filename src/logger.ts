import { createLogger, format, transports } from 'winston';
const getLogger = () => {
  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      format.timestamp(),
      format.align(),
      format.printf(info => `[${info.timestamp}][${info.level}] ${info.message}`)
    ),
    transports: [
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' })
    ]
  });
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.align(),
        format.printf(info => `[${info.timestamp}][${info.level}] ${info.message}`)
      )
    }));
  }
  return logger
}
export default getLogger()

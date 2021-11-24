import { createLogger, format, transports } from 'winston'
import envs from './env'
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.align(),
    format.printf((info) => `[${info.timestamp}][${info.level}] ${info.message}`)
  ),
  transports: [
    new transports.File({ filename: process.env.LOG_ERROR_FILE || 'error.log', level: 'error' }),
    new transports.File({ filename: process.env.LOG_FILE || 'trace.log' })
  ]
})
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.align(),
      format.printf((info) => `[${info.timestamp}][${info.level}] ${info.message}`)
    )
  }))
  logger.debug(`Loaded env variables: ${JSON.stringify(envs.parsed)}`)
}
export default logger

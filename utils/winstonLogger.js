const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf } = format;

const myFormat = printf((info) => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = createLogger({
  format: combine(timestamp(), format.splat(), format.simple(), myFormat),
  transports: [
    new transports.Console({ colorize: true }),
    new transports.File({ filename: "SurveyServer.log", colorize: true }),
    new transports.File({ filename: "SurveyServerError.log", level: "error" }),
  ],
});

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new transports.Console({
//     format: format.json()
//   }));
// }

module.exports = logger;

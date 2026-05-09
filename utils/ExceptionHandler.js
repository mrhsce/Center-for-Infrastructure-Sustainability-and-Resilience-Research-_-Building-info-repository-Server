const logger = require("./winstonLogger");
var schedule = require("node-schedule");
const sql = require("mssql");

let exceptionCodes = [];

module.exports = {
  handler: (res, result) => {
    // logger.info('*** ExceptionHandler Start : %j ', {result: result});
    try {
      if (!result || result.length === 0) {
        logger.info("!!! ExceptionHandler result null !!!");
        // const exceptionObj = findHttpCode(-1);
        res
          .set({ errCode: 0, errMessage: toUnicode("لیست خالی") })
          .status(200)
          .send([]);
        // res.type('html').status(exceptionObj.httpCode).send(exceptionObj.PersianName)
      } else if (result[0].hasOwnProperty("ResultCode")) {
        logger.info(
          "!!! ExceptionHandler hasOwnProperty ResultCode  %s",
          result[0].ResultCode
        );
        const exceptionObj = findHttpCode(result[0].ResultCode);
        let irMessage = exceptionObj.PersianName;
        if (irMessage.includes("%"))
          irMessage = irMessage.replace("%", result[0].ResultText);
        logger.info("!!! ExceptionHandler exceptionObj %j", exceptionObj);
        // const errMessage = exceptionObj.PersianName + result[0].ResultCode == -19 ? result[0].ResultText : '';
        res
          .set({ errCode: exceptionObj.ID, errMessage: toUnicode(irMessage) })
          .status(parseInt(exceptionObj.httpCode))
          .send(result);
      } else {
        logger.info("*** ExceptionHandler result ok *** : ", result[0]);
        res
          .set({
            errCode: 1000,
            errMessage: toUnicode("بدون پیام بانک اطلاعاتی"),
          })
          .status(200)
          .send(result);
      }
    } catch (e) {
      logger.error("*** ExceptionHandler catch ", e);
    }
  },
  getErrMessage: (code) => {
    return toUnicode(findHttpCode(code).PersianName);
  },
  getException: () => {
    logger.error("!!! ExceptionHandler getException ");
    const shema = "dbo";
    const sp = "Resource_Select";
    const request = new sql.Request(pool);

    request.execute(`${shema}.${sp}`, function (err, recordset) {
      if (err) logger.error("!!! ExceptionHandler getException: %s", err);

      let result = null;
      if (recordset) {
        result = recordset.recordset;
      }
      logger.info("!!! ExceptionHandler getException Result: %j", {
        code: 200,
        Response: result,
      });
      exceptionCodes = result;
    });
  },
};

function toUnicode(str) {
  return str
    .split("")
    .map(function (value, index, array) {
      var temp = value.charCodeAt(0).toString(16).padStart(4, "0");
      if (temp.length > 2) {
        return "\\u" + temp;
      }
      return value;
    })
    .join("");
}

function findHttpCode(code) {
  return exceptionCodes.find((o) => o.ID == code);
}

//Cron job in monthly in 1th
// 0 0 1 * *        => monthly
// 0 0 */15 * *     => every 15 days at midnight(00:00)
schedule.scheduleJob("0 0 1 * *", function () {
  this.getException();
});

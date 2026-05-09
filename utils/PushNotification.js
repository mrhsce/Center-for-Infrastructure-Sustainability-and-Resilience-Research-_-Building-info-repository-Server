const config = require("config");
const fcmConfig = config.get("APAMAN.fcmConfig");

var http = require("http");

const sql = require("mssql");
const logger = require("./winstonLogger");

var admin = require("firebase-admin");

module.exports = {
  getSend: () => {
    logger.info("get All Push Notification from DB");
    //connect to your database
    //sp
    const shema = "dbo";
    const sp = "PushNotification_Select";

    // create Request object
    const request = new sql.Request(pool);
    // query to the database and get the data
    request.execute(`${shema}.${sp}`, function (err, recordset) {
      if (err) logger.error("Error get All Push Notification: ", err);

      let result = null;
      if (recordset) {
        result = recordset.recordset;
      }
      logger.info("get All Push Notification Resul: %j", { Response: result });

      result.map((o) => {
        let fcmIds = JSON.parse(o.PushIDs);
        fcmIds = fcmIds.filter(function (oId) {
          return oId.id;
        });
        fcmIds = fcmIds.map((oId) => oId.id);
        _send(o.Title, o.Text, fcmIds);
      });
    });
  },
};

function _send(title, text, fcmIds) {
  logger.info("_send Start All Push Notification prams: %j", {
    title: title,
    text: text,
    fcmIds: fcmIds,
  });

  // These registration tokens come from the client FCM SDKs.
  const registrationTokens = fcmIds;

  const message = {
    notification: {
      title: title,
      body: text,
      // "image": string
    },
    tokens: registrationTokens,
  };

  admin
    .messaging()
    .sendMulticast(message)
    .then((response) => {
      logger.info("_send All Push Notification on end %j", {
        response: response,
      });
      if (response.failureCount > 0) {
        logger.info(
          "_send All Push Notification FailureCount %s",
          response.failureCount
        );
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });
        console.log("List of tokens that caused failures: " + failedTokens);
      }
    })
    .catch((error) => {
      logger.error(
        "!!!!!!!! Error sending PushNotification message catch:",
        error
      );
    });

  // var options = {
  //     host: fcmConfig.host,
  //     path: fcmConfig.path,
  //     method: "POST",
  //     headers: {
  //         "Content-Type": "application/json",
  //         "Authorization": fcmConfig.authorization
  //     }
  // };
  //
  // var req = http.request(options, function (res) {
  //     var responseString = "";
  //
  //     res.on("data", function (data) {
  //         responseString += data;
  //         // save all the data from response
  //     });
  //     res.on("end", function () {
  //         logger.info('_send All Push Notification on end %j', {responseString: responseString});
  //     });
  // });
  //
  // var reqBody = `{
  //           "notification": {
  //             "title": "` + title + `",
  //             "body": "` + text + `"
  //             },
  //           "registration_ids": ` + JSON.stringify(fcmIds) + `
  //         }`;
  //
  // req.write(reqBody);
  // req.end();
}

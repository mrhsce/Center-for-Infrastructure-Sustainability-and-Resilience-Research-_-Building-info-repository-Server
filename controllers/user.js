const express = require("express"),
  router = express.Router();
const logger = require("../utils/winstonLogger");
const crypto = require("crypto");
const jwtRun = require("../utils/jwtRun");
const AdmZip = require("adm-zip");
const path = require("path");
const fastcsv = require("fast-csv");

//______________________USER_LOGIN_____________________
router.post("/login", function (req, res) {
  let password = "";
  if (req.body.password) {
    password = crypto
      .createHash("sha256")
      .update(req.body.password)
      .digest("hex");
  }

  logger.info("API: user/login %j", { body: req.body, password: password });

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    logger.error("API: user/login %j", { message: "bad data", response: 400 });
    return res.status(400).send("bad data");
  }

  if (!req.body.client) {
    logger.error("API: user/login %j", {
      message: "Client is not set",
      response: 400,
    });
    return res.status(400).send("Client is not set");
  }

  // query to the database and get the data
  db.authenticateUser(
    req.body.username,
    password,
    (user) => {
      const token = jwtRun.sign({
        userId: user.id,
        role: "surveyor",
        clientType: req.body.client,
      });
      const responseObject = {
        token: token,
        name: user.name,
        family: user.family,
        role: user.role,
      };
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send(responseObject);
    },
    () => {
      res
        .set({
          errCode: -1,
          errMessage: "Authorization Failed",
        })
        .status(401)
        .send("نام کاربری یا رمز عبور نادرست است");
    }
  );
});

//______________________Update User Password_____________________//
router.post("/updatePassword", function (req, res) {
  logger.info("API: Update User Password %j", {
    params: req.body,
    userId: req.userId,
  });

  let oldPassword = "";
  if (req.body.oldPassword) {
    oldPassword = crypto
      .createHash("sha256")
      .update(req.body.oldPassword)
      .digest("hex");
  }

  if (oldPassword == "") {
    logger.error("API: admin/login %j", {
      message: "bad password",
      response: 400,
    });
    return res.status(400).send({ message: "رمز عبور قبلی نامعتبر است" });
  }

  let newPassword = "";
  if (req.body.newPassword) {
    newPassword = crypto
      .createHash("sha256")
      .update(req.body.newPassword)
      .digest("hex");
  }

  if (newPassword == "") {
    logger.error("API: admin/login %j", {
      message: "bad password",
      response: 400,
    });
    return res.status(400).send({ message: "رمز عبور جدید نامعتبر است" });
  }

  db.changeUserPasswordAfterCheck(
    req.userId,
    oldPassword,
    newPassword,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "رمز عبور با موفقیت به‌روز شد" });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "bad password",
        })
        .status(400)
        .send({ message: "رمز عبور قبلی نامعتبر است" });
    }
  );
});

//______________________Survey Select_____________________//
router.get("/surveys", function (req, res) {
  logger.info("API: Survey/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getAllSurveysForUser((rows) => {
    logger.info("Surveys %j");
    res
      .set({
        errCode: 0,
        errMessage: "Success",
      })
      .type("application/json")
      .status(200)
      .send({ client: db.getClientVersion(req.clientType), surveys: rows });
  }, req.userId);
});

//______________________Published Survey Select_____________________//
router.get("/surveys/published", function (req, res) {
  logger.info("API: Survey/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getAllSurveysForUser(
    (rows) => {
      logger.info("Surveys %j");

      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ client: db.getClientVersion(req.clientType), surveys: rows });
    },
    req.userId,
    "published"
  );
});

//______________________Survey Select One_____________________//
router.get("/surveys/survey/:id", function (req, res) {
  logger.info("API: Survey/Select One %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getSurvey(
    req.params.id,
    (row) => {
      logger.info("Surveys %j");
      db.getSurveyFunctions(req.params.id, (functions) => {
        row.functions = functions;
        res
          .set({
            errCode: 0,
            errMessage: "Success",
          })
          .type("application/json")
          .status(200)
          .send(row);
      });
    },
    true
  );
});

//______________________Download CSV Results Of Survey_____________________//
router.get("/surveys/:id/results", (req, res) => {
  logger.info("API: User DownloadFile/Results Of Survey %j", {
    params: req.params,
  });

  db.getAllCompleteExecutionsOfSurveys(
    req.params.id,
    (rows) => {
      let data = [];
      if (rows.length > 0) {
        res.setHeader(
          "Content-disposition",
          "inline; filename=" + "output.csv"
        );
        // ToDo For Show in Browser
        res.setHeader("Content-type", "text/csv");
        rows.map((o, index) => {
          let information = JSON.parse(o.information);
          let row = {
            id: o.id,
            title: o.title,
            address: information.address,
            latitude: information.latitude,
            longitude: information.longitude,
            startTime: information.startTime,
            endTime: information.endTime,
            lastModifyTime: information.lastModifyTime,
          };
          for (let i = 0; i < o.questionCount; i++) {
            row[i + 1 + "- answer"] = "";
            row[i + 1 + "- flag"] = "";
            row[i + 1 + "- note"] = "";
          }
          try {
            let results = o.resultJson;
            results.map((ans) => {
              switch (ans.type) {
                case "single_select":
                  if (ans.answer && Number.isInteger(ans.answer)) {
                    if (
                      ans.selectionList &&
                      ans.selectionList.length >= ans.answer
                    ) {
                      row[ans.index + "- answer"] =
                        ans.selectionList[ans.answer - 1].text;
                    }
                  }
                  break;
                case "multi_select":
                  if (ans.answer && ans.answer.length > 0) {
                    let answer = "چندگزینه‌ای: ";
                    ans.answer.map((selection) => {
                      answer += ans.selectionList[selection - 1].text + " - ";
                    });
                    answer = answer.substring(0, answer.length - 3);
                    row[ans.index + "- answer"] = answer;
                  }

                  break;
                default:
                  row[ans.index + "- answer"] = ans.answer;
              }

              row[ans.index + "- flag"] = ans.hasFlag ? "دارد" : "";
              row[ans.index + "- note"] = ans.note;
            });
            data.push(row);
          } catch (e) {
            logger.error("API: admin/executions/:id/results %j", {
              message: "bad row: " + e,
            });
          }
        });

        fastcsv.write(data, { headers: true, writeBOM: true }).pipe(res);
      } else {
        res
          .set({
            errCode: -3,
            errMessage: "Array empty",
          })
          .status(404)
          .send({ message: "شما هیچ اجرایی در پرسشنامه مورد نظر ندارید" });
      }
    },
    req.userId
  );
});

//______________________Execution Create or Update_____________________//
router.post("/executions", function (req, res) {
  let isMultiple = Array.isArray(req.body);
  if (isMultiple) {
    req.body.map((o) => {
      o.surveyorId = req.userId;
    });
    db.addMultipleNewExecution(req.userId, req.body, (results) => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({
          message: "افزودن لیست اجراها به پایان رسید.",
          results: results,
        });
    });
  } else {
    req.body.surveyorId = req.userId;
    db.addOrUpdateExecution(
      req.userId,
      req.body,
      () => {
        res
          .set({
            errCode: 0,
            errMessage: "Success",
          })
          .type("application/json")
          .status(200)
          .send({
            message: req.body.id
              ? "اجرا با موفقیت به روز شد"
              : "اجرا با موفقیت افروده شد",
          });
      },
      () => {
        res
          .set({
            errCode: -2,
            errMessage: "Insertion Failed",
          })
          .status(400)
          .send({
            message: req.body.id
              ? "خطا در به روز رسانی اجرا"
              : "خطا در افزودن اجرا",
          });
      }
    );
  }
});

//______________________Hundred Last Execution Select _____________________//
router.get("/executions/lastHundred/:increasing", function (req, res) {
  logger.info("API: Hundred Last Execution/Select %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getLastHundredExecutions(
    req.params.increasing,
    (rows) => {
      logger.info("Hundred Last Execution %j");
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send(rows);
    },
    req.userId
  );
});

//______________________Executions Select One_____________________//
router.get("/executions/:id", (req, res) => {
  logger.info("API: Executions/Select One %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getExecution(
    req.params.id,
    (rows) => {
      logger.info("Executions Select One %j");

      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send(rows);
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Deletion Failed",
        })
        .status(400)
        .send({ message: "اجرای مورد نظر وجود ندارد" });
    }
  );
});

//______________________Download Images Of Execution _____________________//
router.get("/executions/:id/images", (req, res) => {
  logger.info("API: User Downloads Images Of Execution %j", {
    params: req.params /*, token_userId:token*/,
  });

  db.getExecution(
    req.params.id,
    (row) => {
      if (row.ownerId === req.userId) {
        let zip = new AdmZip();
        try {
          row.resultJson.map((answer) => {
            if (answer.imageList && answer.imageList.length > 0) {
              answer.imageList.map((img) => {
                if (img.fileName) {
                  zip.addLocalFile(
                    uploadPath + path.sep + img.fileName,
                    "Answer " + answer.index + path.sep
                  );
                }
              });
            }
          });

          let zipFileContents = zip.toBuffer();

          res.writeHead(200, {
            "Content-Disposition": `attachment; filename="${
              "Execution " + row.id + " results.zip"
            }"`,
            "Content-Type": "application/zip",
          });

          return res.end(zipFileContents);
        } catch (e) {
          res
            .set({
              errCode: -3,
              errMessage: "Error",
            })
            .status(400)
            .send({ message: "خطا در دریافت عکس‌ها" });
        }
      } else {
        res
          .set({
            errCode: -3,
            errMessage: "Access denied",
          })
          .status(403)
          .send({ message: "اجرای مورد نظر متعلق به شما نیست" });
      }
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Does not exist",
        })
        .status(400)
        .send({ message: "اجرای مورد نظر وجود ندارد" });
    }
  );
});

//______________________Executions Of A Survey Select _____________________//
router.get(
  "/surveys/executions/:id/:from/:to/:increasing",
  function (req, res) {
    logger.info("API: Executions Of A Survey/Select %j", {
      params: req.params,
      userId: req.userId,
    });

    db.getSomeExecutionsOfSurveyForUser(
      req.params.id,
      req.params.from,
      req.params.to,
      req.params.increasing,
      req.userId,
      (rows) => {
        logger.info("Executions Of A Surve %j");

        res
          .set({
            errCode: 0,
            errMessage: "Success",
          })
          .type("application/json")
          .status(200)
          .send(rows);
      }
    );
  }
);

module.exports = router;

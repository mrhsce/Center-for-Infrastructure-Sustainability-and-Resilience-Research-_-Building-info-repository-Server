const express = require("express"),
  router = express.Router();
const sql = require("mssql");

const logger = require("../utils/winstonLogger");

const crypto = require("crypto");
const jwtRun = require("../utils/jwtRun");

const config = require("config");

//______________________USER_LOGIN_____________________
router.post("/login", function (req, res) {
  let password = "";
  if (req.body.password) {
    password = crypto
      .createHash("sha256")
      .update(req.body.password)
      .digest("hex");
  }

  logger.info("API: admin/login %j", { body: req.body, password: password });

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    logger.error("API: admin/login %j", { message: "bad data", response: 400 });
    return res.status(400).send("bad data");
  }

  // query to the database and get the data
  db.authenticateGroupHead(
    req.body.username,
    password,
    (user, groups) => {
      const token = jwtRun.sign({ userId: user.id, role: "groupHead" });
      const responseObject = {
        token: token,
        name: user.name,
        family: user.family,
        role: "groupHead",
        userGroups: groups,
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
    (error) => {
      let type = "Authorization Failed";
      let message = "نام کاربری یا رمز عبور نادرست است";
      switch (error.error) {
        case "user":
          break;
        case "userGroup":
          type = "No userGroups";
          message = "شما مسئول هیچ تیمی نیستید.";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________getAllUserGroupsForGroupHead_____________________//
router.get("/userGroups", function (req, res) {
  logger.info("API: getAllUserGroupsForGroupHead/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  let groups = db.getAllUserGroupsForGroupHead(req.userId);

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(groups);
});

//______________________ UserGroup Select one_____________________//
router.get("/userGroups/:groupId", function (req, res) {
  logger.info("API: UserGroup/Select One %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkUserGroupAccessForGroupHead(
    req.userId,
    req.params.groupId,
    () => {
      let group = db.getUserGroup(req.params.groupId);

      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send(group);
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به تیم مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Survey Select FOR A GROUP_____________________//
router.get("/userGroups/:groupId/surveys", function (req, res) {
  logger.info("API: Survey/Select ALL FOR A GROUP %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkUserGroupAccessForGroupHead(
    req.userId,
    req.params.groupId,
    () => {
      db.getAllSurveysForGroup(req.params.groupId, (rows) => {
        logger.info("Surveys %j");

        res
          .set({
            errCode: 0,
            errMessage: "Success",
          })
          .type("application/json")
          .status(200)
          .send(rows);
      });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به تیم مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Survey Select One_____________________//
router.get("/surveys/survey/:id", function (req, res) {
  logger.info("API: Survey/Select One For groupHead %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkSurveyAccessForGroupHead(
    req.userId,
    req.params.id,
    () => {
      db.getSurvey(req.params.id, (row) => {
        logger.info("Surveys %j");

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
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به پرسش‌نامه مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Executions Select One_____________________//
router.get("/executions/:id", function (req, res) {
  logger.info("API: Executions/Select One For groupHead %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkExecutionAccessForGroupHead(
    req.userId,
    req.params.id,
    () => {
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
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به اجرای مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Executions Of A Survey For a Group _____________________//
router.get(
  "/userGroups/:groupId/surveys/:surveyId/executions",
  function (req, res) {
    logger.info("API: Executions Of A Survey/Select %j", {
      params: req.params,
      userId: req.userId,
    });
    db.checkUserGroupAccessForGroupHead(
      req.userId,
      req.params.groupId,
      () => {
        db.getAllExecutionsOfSurveysForGroup(
          req.params.groupId,
          req.params.surveyId,
          (rows) => {
            logger.info("Executions Of A Survey For a Group %j");

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
      },
      () => {
        res
          .set({
            errCode: -3,
            errMessage: "Authorization Failed",
          })
          .status(403)
          .send({ message: "شما به تیم مورد نظر دسترسی ندارید" });
      }
    );
  }
);

//______________________Functions Of A Survey Select _____________________//
router.get("/surveys/functions/:id", function (req, res) {
  logger.info("API: Functions Of A Survey/Select %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkSurveyAccessForGroupHead(
    req.userId,
    req.params.id,
    () => {
      db.getSurveyFunctions(req.params.id, (rows) => {
        logger.info("Functions Of A Survey %j");

        res
          .set({
            errCode: 0,
            errMessage: "Success",
          })
          .type("application/json")
          .status(200)
          .send(rows);
      });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به پرسش‌نامه مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Change Group Survey Publish Status_____________________//
router.post(
  "/userGroups/:groupId/surveys/:id/:publishStatus",
  function (req, res) {
    logger.info("API: Change Survey Publish Status %j", {
      params: req.body,
      userId: req.userId,
    });

    if (req.params.publishStatus != 0 && req.params.publishStatus != 1) {
      logger.error("API: admin/login %j", {
        message: "bad publish status",
        response: 400,
      });
      return res.status(400).send({ message: "وضعیت نامعتبر است" });
    }

    db.checkUserGroupAccessForGroupHead(
      req.userId,
      req.params.groupId,
      () => {
        db.changeSurveyStatusForUserGroup(
          req.params.groupId,
          req.params.id,
          req.params.publishStatus,
          () => {
            res
              .set({
                errCode: 0,
                errMessage: "Success",
              })
              .type("application/json")
              .status(200)
              .send({ message: "پرسش‌نامه با موفقیت به‌روز شد" });
          },
          (error) => {
            let type = "Failure";
            let message = "خطا";
            switch (error.error) {
              case "not exists":
                type = "Not available";
                message = "گروه مورد نظر به پرسش‌نامه دسترسی ندارد";
                break;
              case "update failed":
                type = "Update Failed";
                message = "خطا در به روزرسانی تیم";
                break;
            }
            res
              .set({
                errCode: -2,
                errMessage: type,
              })
              .status(400)
              .send({ message: message });
          }
        );
      },
      () => {
        res
          .set({
            errCode: -3,
            errMessage: "Authorization Failed",
          })
          .status(403)
          .send({ message: "شما به تیم مورد نظر دسترسی ندارید" });
      }
    );
  }
);

//______________________Delete Executions_____________________//
router.delete("/executions/:id", function (req, res) {
  logger.info("API: Executions/Delete %j", {
    params: req.params,
    userId: req.userId,
  });

  db.checkExecutionAccessForGroupHead(
    req.userId,
    req.params.id,
    () => {
      db.deleteExecution(
        req.params.id,
        () => {
          res
            .set({
              errCode: 0,
              errMessage: "Success",
            })
            .type("application/json")
            .status(200)
            .send({ message: "اجرا با موفقیت حذف شد" });
        },
        () => {
          res
            .set({
              errCode: -2,
              errMessage: "Insertion Failed",
            })
            .status(400)
            .send({ message: "خطا در حذف اجرا" });
        }
      );
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "شما به اجرای مورد نظر دسترسی ندارید" });
    }
  );
});

//______________________Download Results Of Survey For a Group_____________________//
router.get(
  "/userGroups/:groupId/surveys/:surveyId/results",
  function (req, res) {
    logger.info("API: DownloadFile/Results Of Survey For a Group %j", {
      params: req.params,
    });

    db.checkUserGroupAccessForGroupHead(
      req.userId,
      req.params.groupId,
      () => {
        res.setHeader(
          "Content-disposition",
          "inline; filename=" +
            "group " +
            req.params.groupId +
            " output " +
            "for survey " +
            req.params.surveyId +
            ".csv"
        );
        // ToDo For Show in Browser
        res.setHeader("Content-type", "text/csv");

        db.getAllExecutionsOfSurveysForGroup(
          req.params.groupId,
          req.params.surveyId,
          (rows) => {
            let data = [];
            rows.map((o, index) => {
              let row = {
                id: index + 1,
                title: o.title,
                address: o.information.address,
                startTime: o.information.startTime,
                endTime: o.information.endTime,
                lastModifyTime: o.information.lastModifyTime,
                name: o.name,
                family: o.family,
              };
              for (let i = 0; i < o.questionCount; i++) {
                row["answer" + (i + 1)] = "";
              }
              try {
                let results = JSON.parse(o.resultJson);
                results.map((ans) => {
                  row["answer" + ans.index] = ans.answer;
                });
                data.push(row);
              } catch (e) {
                logger.error(
                  "API: DownloadFile/Results Of Survey For a Group %j",
                  { message: "bad row: " + e }
                );
              }
            });

            fastcsv.write(data, { headers: true, writeBOM: true }).pipe(res);
          },
          true
        );
      },
      () => {
        res
          .set({
            errCode: -3,
            errMessage: "Authorization Failed",
          })
          .status(403)
          .send({ message: "شما به تیم مورد نظر دسترسی ندارید" });
      }
    );
  }
);

module.exports = router;

const express = require("express"),
  router = express.Router();

const logger = require("../../utils/winstonLogger");
const AdmZip = require("adm-zip");

const fs = require("fs");

const path = require("path");

const config = require("config");
const uploadConfig = config.get("APAMAN.uploadConfig");
const uploadPath = process.env.PWD + uploadConfig.path;

//______________________Executions Select One_____________________//
router.get("/:id", function (req, res) {
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

//______________________Executions Update Status_____________________//
router.put("/:id/:status", function (req, res) {
  logger.info("API: Executions/Select One %j", {
    params: req.params,
    userId: req.userId,
  });

  db.setExecutionStatus(
    req.params.id,
    req.params.status,
    () => {
      logger.info("Executions Select One %j");
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "وضعیت اجرا با موفقیت به روز شد" });
    },
    (error) => {
      res
        .set({
          errCode: -3,
          errMessage: "Update Failed",
        })
        .status(400)
        .send({ message: error });
    }
  );
});

//______________________Execution Create or Update_____________________//
router.post("/executions", function (req, res) {
  // logger.info('API: Execution/Create %j', {params: req.body, userId: req.userId});
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

//______________________Delete Executions_____________________//
router.delete("/:id", function (req, res) {
  logger.info("API: Executions/Delete %j", {
    params: req.params,
    userId: req.userId,
  });

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
});

//______________________Download Images Of Execution _____________________//
router.get("/:id/images", function (req, res) {
  logger.info("API: Download Images Of Execution %j", {
    params: req.params /*, token_userId:token*/,
  });

  db.getExecution(
    req.params.id,
    (row) => {
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
  "/executionsOfSurvey/:id/:from/:to/:increasing",
  function (req, res) {
    logger.info("API: Executions Of A Survey/Select %j", {
      params: req.params,
      userId: req.userId,
    });

    let to = req.params.to;

    if (req.params.from >= to || to - req.params.from > 100) {
      to = parseInt(req.params.from) + 50;
    }

    db.getSomeExecutionsOfSurvey(
      req.params.id,
      req.params.from,
      to,
      req.params.increasing,
      (rows) => {
        logger.info("Executions Of A Survey %j");

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

//______________________Hundred Last Execution Select _____________________//
router.get("/lastHundred/:increasing", function (req, res) {
  logger.info("API: Hundred Last Execution/Select %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getLastHundredExecutions(req.params.increasing, (rows) => {
    logger.info("Hundred Last Execution %j");

    res
      .set({
        errCode: 0,
        errMessage: "Success",
      })
      .type("application/json")
      .status(200)
      .send(rows);
  });
});

module.exports = router;

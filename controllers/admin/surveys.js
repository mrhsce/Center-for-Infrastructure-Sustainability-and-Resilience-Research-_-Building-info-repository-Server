const express = require("express"),
  router = express.Router();
const logger = require("../../utils/winstonLogger");
const fastcsv = require("fast-csv");
const xl = require("excel4node");

//______________________Survey Select_____________________//
router.get("/", function (req, res) {
  logger.info("API: Survey/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getAllSurveys("", (rows) => {
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
});

//______________________Survey Select By Filter_____________________//
router.get("/:filter", function (req, res) {
  logger.info("API: Survey/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getAllSurveys(req.params.filter, (rows) => {
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
});

//______________________Survey Select One_____________________//
router.get("/survey/:id", function (req, res) {
  logger.info("API: Survey/Select One %j", {
    params: req.params,
    userId: req.userId,
  });

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
});

//______________________Survey add function_____________________//
router.post("/survey/:id/function", function (req, res) {
  logger.info("API: Survey/add function %j", {
    params: req.params,
    userId: req.userId,
  });

  if (!(req.body.name && req.body.name.length > 0)) {
    return res.status(400).send({ message: "نام تابع باید تعیین شود" });
  }

  let body = null;
  try {
    body = JSON.parse(req.body.body);
  } catch (e) {
    return res.status(400).send({ message: "خطا در خواندن مقادیر" });
  }

  if (body && body.length > 0) {
    for (let i = 0; i < body.length; i++) {
      if (body[i].length != 2) {
        return res.status(400).send({ message: "مقدار تابع غیرمعتبر است." });
      }
    }
  } else {
    return res.status(400).send({ message: "مقادیر تابع باید تعیین شود" });
  }

  db.createFunction(
    { surveyId: req.params.id, name: req.body.name, body: req.body.body },
    (type) => {
      switch (type) {
        case "create":
          res
            .set({
              errCode: 0,
              errMessage: "Success",
            })
            .type("application/json")
            .status(200)
            .send({ message: "تابع با موفقیت ایجاد شد" });
          break;
        case "update":
          res
            .set({
              errCode: 0,
              errMessage: "Success",
            })
            .type("application/json")
            .status(200)
            .send({ message: "تابع با موفقیت به روزرسانی شد" });
          break;
      }
    },
    (err, type) => {
      switch (type) {
        case "update":
          res
            .set({
              errCode: -2,
              errMessage: "Insertion Failed",
            })
            .status(400)
            .send({ message: "خطا در به روزرسانی تابع" });
          break;
        case "create":
        default:
          res
            .set({
              errCode: -2,
              errMessage: "Insertion Failed",
            })
            .status(400)
            .send({ message: "خطا در ایجاد تابع" });
          break;
      }
    }
  );
});

//______________________Survey delete function_____________________//
router.delete("/survey/:id/function/:name", function (req, res) {
  logger.info("API: Survey/delete function %j", {
    params: req.params,
    userId: req.userId,
  });

  db.deleteFunction(
    req.params.id,
    req.params.name,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "تابع با موفقیت حذف شد" });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Deletion Failed",
        })
        .status(400)
        .send({ message: "خطا در حذف تابع" });
    }
  );
});

//______________________Functions Of A Survey Select _____________________//
router.get("/functions/:id", function (req, res) {
  logger.info("API: Functions Of A Survey/Select %j", {
    params: req.params,
    userId: req.userId,
  });

  db.getSurveyFunctions(req.params.id, (rows) => {
    logger.info("Functions Of A Surve %j");

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

//______________________Survey Create or Update_____________________//
router.post("/", function (req, res) {
  logger.info("API: Survey/Create %j", {
    params: req.body,
    userId: req.userId,
  });

  db.addOrUpdateSurvey(
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
            ? "پرسش‌نامه با موفقیت به روز شد"
            : "پرسش‌نامه با موفقیت ایجاد شد",
        });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: req.body.id ? "Update Failed" : "Insertion Failed",
        })
        .status(400)
        .send({
          message: req.body.id
            ? "خطا در به روزرسانی پرسش‌نامه"
            : "خطا در ایجاد پرسش‌نامه",
        });
    }
  );
});

//______________________Download Xlsx Results Of Survey_____________________//
router.get("/:id/resultsExcel", function (req, res) {
  logger.info("API: DownloadFile/Results Of Survey %j", { params: req.params });

  // ToDo For Show in Browser
  res.setHeader(
    "Content-type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  db.getAllCompleteExecutionsOfSurveys(req.params.id, (rows) => {
    if (!(rows && rows.length > 0)) {
      res
        .set({
          errCode: -2,
          errMessage: "Empty survey",
        })
        .status(400)
        .send({ message: "هیچ اجرایی وجود ندارد" });
      return;
    }

    let wb = new xl.Workbook();
    let ws = wb.addWorksheet(rows[0].surveyTitle);
    let headerStyle = wb.createStyle({
      font: {
        color: "#FF0800",
        size: 12,
      },
      // numberFormat: '$#,##0.00; ($#,##0.00); -',
    });

    let subheaderStyle = wb.createStyle({
      font: {
        color: "#8f187c",
        size: 12,
      },
      // fill: {
      //     type: "pattern",
      //     patternType: "solid",
      //     bgColor: "#33FF35",
      //     fgColor: "#33FF35"
      // }
      // numberFormat: '$#,##0.00; ($#,##0.00); -',
    });

    let rowsStyle = wb.createStyle({
      font: {
        color: "black",
        size: 12,
      },
      // numberFormat: '$#,##0.00; ($#,##0.00); -',
    });

    // Setup the headers
    let column = 1;
    ws.cell(1, column++)
      .string("Id")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("Title")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("address")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("latitude")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("longitude")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("startTime")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("endTime")
      .style(headerStyle);
    ws.cell(1, column++)
      .string("lastModifyTime")
      .style(headerStyle);
    ws.row(1).freeze();
    ws.row(2).freeze();
    ws.column(1).freeze();
    ws.column(1).setWidth(5);
    ws.column(2).setWidth(20);
    ws.column(3).setWidth(20);
    ws.column(4).setWidth(20);
    ws.column(5).setWidth(20);
    ws.row(1).setHeight(25);

    rows[0].resultJson.map((question) => {
      if (question.type == "multi_select") {
        let selections = question.selectionList
          ? question.selectionList.length
          : 0;
        ws.cell(1, column, 1, column + 1 + selections, true)
          .string(question.text)
          .style(headerStyle);
        column += 2 + selections;
      } else {
        ws.cell(1, column, 1, column + 2, true)
          .string(question.text)
          .style(headerStyle);
        column += 3;
      }
      ws.column(column - 1).setWidth(50);
    });
    column = 9;
    rows[0].resultJson.map((question) => {
      if (question.type == "multi_select") {
        question.selectionList.map((selection) => {
          ws.cell(2, column++)
            .string(selection.text)
            .style(subheaderStyle);
        });
      } else {
        ws.cell(2, column++)
          .string("Answer")
          .style(subheaderStyle);
      }
      ws.cell(2, column++)
        .string("Flag")
        .style(subheaderStyle);
      ws.cell(2, column++)
        .string("Notes")
        .style(subheaderStyle);
    });
    let row = 3;
    rows.map((o, index) => {
      let column = 1;
      let information = JSON.parse(o.information);
      ws.cell(row, column++)
        .string(o.id + "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(o.title + "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(information.address ? information.address : "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(information.latitude ? information.latitude + "" : "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(information.longitude ? information.longitude + "" : "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(information.startTime ? information.startTime + "" : "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(information.endTime ? information.endTime + "" : "")
        .style(rowsStyle);
      ws.cell(row, column++)
        .string(
          information.lastModifyTime ? information.lastModifyTime + "" : ""
        )
        .style(rowsStyle);

      try {
        o.resultJson.map((question) => {
          switch (question.type) {
            case "single_select":
              let answer = "";
              if (question.answer > 0) {
                answer = question.selectionList[question.answer - 1].text;
              }
              ws.cell(row, column++)
                .string(answer != undefined ? answer + "" : "")
                .style(rowsStyle);
              break;
            case "multi_select":
              question.selectionList.map((selection) => {
                ws.cell(row, column++)
                  .string(
                    question.answer && question.answer.includes(selection.index)
                      ? "بله"
                      : ""
                  )
                  .style(rowsStyle);
              });
              break;
            case "number_input":
            case "text_input":
            default:
              ws.cell(row, column++)
                .string(
                  question.answer != undefined ? question.answer + "" : ""
                )
                .style(rowsStyle);
          }

          ws.cell(row, column++)
            .string(question.hasFlag ? "دارد" : "")
            .style(rowsStyle);
          ws.cell(row, column++)
            .string(question.note ? question.note : "")
            .style(rowsStyle);
        });
      } catch (e) {
        logger.error("API: admin/executions/:id/results %j", {
          message: "bad row: " + e,
        });
      }
      row++;
    });
    wb.write(`result.xlsx`, res);
  });
});

//______________________Download CSV Results Of Survey_____________________//
router.get("/:id/results", function (req, res) {
  logger.info("API: DownloadFile/Results Of Survey %j", { params: req.params });

  res.setHeader("Content-disposition", "inline; filename=" + "output.csv");
  // ToDo For Show in Browser
  res.setHeader("Content-type", "text/csv");

  db.getAllCompleteExecutionsOfSurveys(req.params.id, (rows) => {
    let data = [];
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
  });
});

//______________________Chagne Survey Publish Status_____________________//
router.post("/:id/:publishStatus", function (req, res) {
  logger.info("API: Chagne Survey Publish Status %j", {
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

  db.changeSurveyStatus(
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
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: "خطا در به‌روزرسانی پرسش‌نامه" });
    }
  );
});

//______________________Delete Create_____________________//
router.delete("/:id", function (req, res) {
  logger.info("API: Survey/Delete %j", {
    params: req.body,
    userId: req.userId,
  });

  db.deleteSurvey(
    req.params.id,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "پرسش‌نامه با موفقیت حذف شد" });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: "خطا در حذف پرسش‌نامه" });
    }
  );
});

module.exports = router;

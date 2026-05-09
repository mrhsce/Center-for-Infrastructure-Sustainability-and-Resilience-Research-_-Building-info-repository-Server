const express = require("express"),
  router = express.Router();
const logger = require("../../utils/winstonLogger");
const fastcsv = require("fast-csv");
const crypto = require("crypto");
const jwtRun = require("../../utils/jwtRun");

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
  db.authenticateAdmin(
    req.body.username,
    password,
    (user) => {
      const token = jwtRun.sign({ userId: user.id, role: "admin" });
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

router.get("/getEmptyImages", function (req, res) {
  db.getEmptyImages(
    (rows) => {
      res.setHeader("Content-disposition", "inline; filename=" + "output.csv");
      // ToDo For Show in Browser
      res.setHeader("Content-type", "text/csv");

      let data = [];
      rows.map((o, index) => {
        let row = {};
        row["شناسه"] = o.id;
        row["مجری"] = o.owner;
        row["تعداد عکس‌های خالی"] = o.emptyImages.length;
        row["تعداد عکس‌های تکراری"] = o.duplicateImages.length;
        data.push(row);
      });

      fastcsv.write(data, { headers: true, writeBOM: true }).pipe(res);
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Failed",
        })
        .status(403)
        .send({ message: "خطا" });
    }
  );
});

router.post("/clean", function (req, res) {
  db.cleanEmptyImages(
    (rows) => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ removedImages: rows });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "خطا" });
    }
  );
});

router.post("/handle", function (req, res) {
  db.convertExecution(
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "با موفقیت انجام شد" });
    },
    (result) => {
      res
        .set({
          errCode: -3,
          errMessage: "Failed",
        })
        .status(403)
        .send(result);
    }
  );
});

router.post("/addField", function (req, res) {
  db.updateExecutionTableAddField(
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "فیلد با موفقیت افزوده شد" });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Authorization Failed",
        })
        .status(403)
        .send({ message: "خطا" });
    },
    req.body.name,
    req.body.type,
    req.body.defaultValue
  );
});

router.post("/setClientInfo/:type", function (req, res) {
  logger.info("API: admin/setClientInfo %j", {
    body: req.body,
    type: req.params.type,
  });

  if (!(req.body.constructor === Object && req.body.versionCode)) {
    logger.error("API: admin/setClientInfo %j", {
      message: "bad data",
      response: 400,
    });
    return res.status(400).send("bad data");
  }

  if (!(req.params.type == "android" || req.params.type == "ios")) {
    logger.error("API: admin/setClientInfo %j", {
      message: "bad data",
      response: 400,
    });
    return res.status(400).send("bad data");
  }

  db.updateClientInfo(
    req.params.type,
    req.body,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Update Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: ` با موفقیت به روز شد ${req.params.type} کلاینت ` });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Update Failed",
        })
        .status(403)
        .send({ message: "خطا در به روز رسانی کلاینت" });
    }
  );
});

module.exports = router;

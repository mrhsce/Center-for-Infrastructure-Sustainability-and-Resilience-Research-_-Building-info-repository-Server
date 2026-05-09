const express = require("express"),
  router = express.Router();
const sql = require("mssql");

const logger = require("../../utils/winstonLogger");

const crypto = require("crypto");
const jwtRun = require("../../utils/jwtRun");

const config = require("config");
const uploadConfig = config.get("APAMAN.uploadConfig");
const uploadPath = process.env.PWD + uploadConfig.path;

const ExceptionHandler = require("../../utils/ExceptionHandler");

//______________________User Select all_____________________//
router.get("/", function (req, res) {
  logger.info("API: User/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  let users = db.getAllUsers();

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(users);
});

//______________________User Select All by Filter_____________________//
router.get("/:filter", function (req, res) {
  logger.info("API: User/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  let users = db.getAllUsersByFilter(req.params.filter);

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(users);
});

//______________________User Select One_____________________//
router.get("/user/:id", function (req, res) {
  logger.info("API: User/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  let user = db.getUser(req.params.id);

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(user);
});

//______________________User Create_____________________//
router.post("/users", function (req, res) {
  logger.info("API: User/Create %j", { params: req.body, userId: req.userId });

  if (!req.body.username || req.body.username == "") {
    logger.error("API: admin/login %j", {
      message: "bad username",
      response: 400,
    });
    return res.status(400).send({ message: "نام کاربری نامعتبر است" });
  }

  if (req.body.role != "admin" && req.body.role != "surveyor") {
    logger.error("API: admin/login %j", { message: "bad role", response: 400 });
    return res.status(400).send({ message: "نقش کاربر نامعتبر است" });
  }

  let password = "";
  if (req.body.password) {
    password = crypto
      .createHash("sha256")
      .update(req.body.password)
      .digest("hex");
  }

  logger.info("API: admin/login %j", { body: req.body, password: password });

  if (password == "") {
    logger.error("API: admin/login %j", {
      message: "bad password",
      response: 400,
    });
    return res.status(400).send({ message: "رمز عبور نامعتبر است" });
  }

  req.body.password = password;

  db.createUser(
    req.body,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "کاربر با موفقیت ایجاد شد" });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: "خطا در ایجاد کاربر" });
    }
  );
});

//______________________Update User Password_____________________//
router.post("/:id/updatePassword", function (req, res) {
  logger.info("API: Update User Password %j", {
    params: req.body,
    userId: req.userId,
  });

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
    return res
      .status(400)
      .send({ message: "لطفا رمز عبور جدید را به درستی وارد کنید" });
  }

  db.changeUserPassword(
    req.params.id,
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
          errMessage: "Error",
        })
        .status(400)
        .send({ message: "خطا در تغییر کلمه عبور" });
    }
  );
});

//______________________Chagne User Role_____________________//
router.post("/:id/:role", function (req, res) {
  logger.info("API: Chagne User Role %j", {
    params: req.body,
    userId: req.userId,
  });

  if (req.params.role != "admin" && req.params.role != "surveyor") {
    logger.error("API: admin/login %j", { message: "bad role", response: 400 });
    return res.status(400).send({ message: "نقش نامعتبر است" });
  }

  db.changeUserRole(
    req.params.id,
    req.params.role,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "کاربر با موفقیت به‌روز شد" });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: "کاربر وجود ندارد" });
    }
  );
});

//______________________Delete Create_____________________//
router.delete("/:id", function (req, res) {
  logger.info("API: User/Delete %j", { params: req.body, userId: req.userId });

  db.deleteUser(
    req.params.id,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "کاربر با موفقیت حذف شد" });
    },
    () => {
      res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: "خطا در حذف کاربر" });
    }
  );
});

module.exports = router;

const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// var mime = require('mime-types');

const logger = require("../utils/winstonLogger");

const config = require("config");
const uploadConfig = config.get("APAMAN.uploadConfig");
const uploadPath = process.env.PWD + uploadConfig.path;

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, uploadPath);
  },
  filename: function (req, file, callback) {
    logger.info("API: UploadFile filename %j", { name: file.originalname });
    console.log(file);

    if (req.params && req.params.imageName && req.params.surveyId) {
      // Check if the file exists in the current directory.
      fs.access(
        uploadPath + "/" + req.params.surveyId + "_" + req.params.imageName,
        fs.constants.F_OK,
        (err) => {
          let fileName = "";
          if (err) {
            fileName = req.params.surveyId + "_" + req.params.imageName;
          } else {
            fileName = "";
          }
          console.log(fileName);
          callback(null, fileName);
        }
      );
    } else {
      callback(null, Date.now() + path.extname(file.originalname));
    }
  },
});

router.post("/executionImage", function (req, res) {
  logger.info("************* API: UploadFile %j", {
    body: req.body,
    params: req.params,
    token_userId: req.userId,
  });

  const upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
      const ext = path.extname(file.originalname);
      console.log(file.originalname);
      if (
        ext !== ".png" &&
        ext !== ".jpg" &&
        ext !== ".gif" &&
        ext !== ".jpeg"
      ) {
        return callback(res.end("Only images are allowed"), null);
      }
      callback(null, true);
    },
  }).single("userFile");
  upload(req, res, function (err) {
    if (err) {
      logger.error("API: UploadFile Error uploading file. %s", err);
      return res.end("Error uploading file.");
    }
    logger.info("API: UploadFile fileName: %s", req.file.filename);
    if (req.file.filename) {
      res.send({ fileName: req.file.filename });
    } else {
      logger.error("API: UploadFile Error uploading file. %s", err);
      return res.end("Error uploading file.");
    }
  });
});

router.post("/surveyImage/:surveyId/:imageName", function (req, res) {
  logger.info("************* API: Upload survey image %j", {
    body: req.body,
    params: req.params,
    token_userId: req.userId,
  });

  const upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
      const ext = path.extname(req.params.imageName);
      if (
        ext !== ".png" &&
        ext !== ".jpg" &&
        ext !== ".gif" &&
        ext !== ".jpeg"
      ) {
        logger.error("API: UploadFile format Image Don`t currect");
        res
          .set({
            errCode: -2,
            errMessage: "Insertion Failed",
          })
          .status(400)
          .send({ message: "فورمت عکس پذیرفته شده نیست." });
      }
      callback(null, true);
    },
  }).single("userFile");
  upload(req, res, function (err) {
    if (err) {
      logger.error("API: UploadFile Error uploading file. %s", err);
      if (req.file.filename == "") {
        return res
          .set({
            errCode: -2,
            errMessage: "Insertion Failed",
          })
          .status(400)
          .send({ message: "عکس وجود دارد. لطفا ابتدا قبلی را حذف نمایید." });
      } else {
        return res
          .set({
            errCode: -2,
            errMessage: "Insertion Failed",
          })
          .status(400)
          .send({ message: "خطا در آپلود عکس" });
      }
    }
    logger.info("API: UploadFile fileName: %s", req.file.filename);
    res.send({ fileName: req.file.filename });
  });
});

router.delete("/executionImage/:imageName", function (req, res) {
  logger.info("************* API: delete survey image %j", {
    body: req.body,
    params: req.params,
    token_userId: req.userId,
  });

  const fileName = req.params.imageName;

  fs.access(uploadPath + "/" + fileName, fs.constants.F_OK, (err) => {
    if (err) {
      return res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: `عکس ${fileName} وجود ندارد.` });
    } else {
      fs.unlinkSync(uploadPath + "/" + fileName);
    }

    return res
      .set({
        errCode: 0,
        errMessage: "Success",
      })
      .status(200)
      .send({ message: `عکس ${fileName} با موفقیت حذف شد.` });
  });
});

router.delete("/surveyImage/:surveyId/:imageName", function (req, res) {
  logger.info("************* API: delete survey image %j", {
    body: req.body,
    params: req.params,
    token_userId: req.userId,
  });

  const fileName = req.params.surveyId + "_" + req.params.imageName;

  fs.access(uploadPath + "/" + fileName, fs.constants.F_OK, (err) => {
    if (err) {
      return res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: `عکس ${fileName} وجود ندارد.` });
    } else {
      fs.unlinkSync(uploadPath + "/" + fileName);
    }

    return res
      .set({
        errCode: 0,
        errMessage: "Success",
      })
      .status(200)
      .send({ message: `عکس ${fileName} با موفقیت حذف شد.` });
  });
});

router.get("/executionImage/:fileName", function (req, res) {
  logger.info("API: DownloadFile/getFile %j", {
    params: req.params /*, token_userId:token*/,
  });

  const file = uploadPath + path.sep + req.params.fileName;
  const filename = path.basename(file);
  logger.info("API: DownloadFile/getFile: %j", {
    file: file,
    fileName: filename,
  });
  // var mimetype = mime.lookup(file);

  res.setHeader("Content-disposition", "inline; filename=" + filename);
  // ToDo For Show in Browser
  // res.setHeader('Content-type', mimetype);

  const filestream = fs.createReadStream(file);
  filestream.on("error", function (err) {
    logger.error("API: DownloadFile/getFile %s", err);
    return res
      .set({
        errCode: -2,
        errMessage: "Insertion Failed",
      })
      .status(400)
      .send({ message: `عکس ${req.params.fileName} وجود ندارد.` });
  });
  filestream.pipe(res);
});

router.get("/surveyImage/:surveyId/:fileName", function (req, res) {
  logger.info("API: DownloadFile/getFile %j", {
    params: req.params /*, token_userId:token*/,
  });

  const file =
    uploadPath + path.sep + req.params.surveyId + "_" + req.params.fileName;
  const filename = path.basename(file);
  logger.info("API: DownloadFile/getFile: %j", {
    file: file,
    fileName: filename,
  });
  // var mimetype = mime.lookup(file);

  res.setHeader("Content-disposition", "inline; filename=" + filename);
  // ToDo For Show in Browser
  // res.setHeader('Content-type', mimetype);

  const filestream = fs.createReadStream(file);
  filestream.on("error", function (err) {
    logger.error("API: DownloadFile/getFile %s", err);
    return res
      .set({
        errCode: -2,
        errMessage: "Insertion Failed",
      })
      .status(400)
      .send({
        message: `عکس ${
          req.params.surveyId + "_" + req.params.fileName
        } وجود ندارد.`,
      });
  });
  filestream.pipe(res);
});

router.get("/surveyImage/:surveyId", function (req, res) {
  logger.info("API: DownloadFile/getFile %j", {
    params: req.params /*, token_userId:token*/,
  });

  let filesList = [];

  fs.readdir(uploadPath, function (err, files) {
    //handling error
    if (err) {
      return res
        .set({
          errCode: -2,
          errMessage: "Insertion Failed",
        })
        .status(400)
        .send({ message: `مشکلی وجود دارد.` });
    }
    //listing all files using forEach
    files.forEach(function (file) {
      // Do whatever you want to do with the file
      if (file.startsWith(req.params.surveyId + "_")) {
        filesList.push(file.split("_")[1]);
      }
    });

    return res
      .set({
        errCode: 0,
        errMessage: "Success",
      })
      .status(200)
      .send({ images: filesList });
  });
});

router.get("/:fileName", function (req, res) {
  logger.info("API: DownloadFile/getFile %j", {
    params: req.params /*, token_userId:token*/,
  });

  const file = uploadPath + path.sep + req.params.fileName;
  const filename = path.basename(file);
  logger.info("API: DownloadFile/getFile: %j", {
    file: file,
    fileName: filename,
  });
  // var mimetype = mime.lookup(file);

  res.setHeader("Content-disposition", "inline; filename=" + filename);
  // ToDo For Show in Browser
  // res.setHeader('Content-type', mimetype);

  const filestream = fs.createReadStream(file);
  filestream.on("error", function (err) {
    logger.error("API: DownloadFile/getFile %s", err);
  });
  filestream.pipe(res);
});

module.exports = router;

const express = require("express"),
  router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// var mime = require('mime-types');

const logger = require("../utils/winstonLogger");

const config = require("config");
const uploadConfig = config.get("APAMAN.uploadConfig");
const uploadPath = process.env.PWD + uploadConfig.path;

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

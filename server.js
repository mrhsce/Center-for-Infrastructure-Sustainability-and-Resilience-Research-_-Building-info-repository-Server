#!/usr/bin node

// Load environment variables from .env file (optional in development, required in production)
require("dotenv").config();

const DatabaseHandler = require("./utils/DatabaseHandler");
const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const app = express();

const logger = require("./utils/winstonLogger");

const {
  verifyToken,
  verifyAdminToken,
  verifyGroupHeadToken,
  verifySurveyorToken,
  noToken,
} = require("./utils/VerifyToken");
const ExceptionHandler = require("./utils/ExceptionHandler");

const swaggerUi = require("swagger-ui-express"),
  swaggerDocument = require("./openapi.json");

app.use(helmet());

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const sql = require("mssql");
// dbConfig for your database

const config = require("config");
const dbConfig = config.get("APAMAN.dbConfig");
pool = new sql.ConnectionPool(dbConfig);
// sqlConnect();

function sqlConnect() {
  pool
    .connect()
    .then((poolResult) => {
      logger.info("*** Sql Server Connection Success ***");
      ExceptionHandler.getException();
    })
    .catch((err) => {
      logger.error("!!! Sql Server Connection Failed !!! %j", err);
      setTimeout(sqlConnect, 3000);
    });
}

// Sqlite3 connection
db = new DatabaseHandler();

app.set("view engine", "ejs");

app.post("/", function (req, res) {
  console.log(req.body);
  res.sendFile(__dirname + "/views/dist/index.html/pages/surveys");
});

const serverConfig = config.get("APAMAN.serverConfig");

// This handles CORS (F&*K it, this costs me a day)
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,DELETE,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    console.log("OPTIONS");
    res.status(200).send();
  } else {
    next();
  }
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// app.use('/api/v1', router);

//*********************************** USER ROUTES **********************************************

//user router
app.use(
  `${serverConfig.SN}/user`,
  verifySurveyorToken,
  require("./controllers/user")
);

//*********************************** ADMIN ROUTES **********************************************

app.use(
  `${serverConfig.SN}/admin/users`,
  verifyAdminToken,
  require("./controllers/admin/users")
);

app.use(
  `${serverConfig.SN}/admin/surveys`,
  verifyAdminToken,
  require("./controllers/admin/surveys")
);

app.use(
  `${serverConfig.SN}/admin/executions`,
  verifyAdminToken,
  require("./controllers/admin/executions")
);

app.use(
  `${serverConfig.SN}/admin/userGroups`,
  verifyAdminToken,
  require("./controllers/admin/userGroups")
);

app.use(
  `${serverConfig.SN}/admin`,
  verifyAdminToken,
  require("./controllers/admin/admin")
);

//*********************************** GROUP HEAD ROUTES **********************************************

//survey router
app.use(
  `${serverConfig.SN}/groupHead`,
  verifyGroupHeadToken,
  require("./controllers/groupHead")
);

//*********************************** GLOBAL ROUTES **********************************************

app.use(
  `${serverConfig.SN}/upload`,
  verifyToken,
  require("./utils/uploadUtils")
);

app.use(`${serverConfig.SN}/image`, noToken, require("./utils/imageUtils"));

//*********************************** ADMIN PANEL ROUTES **********************************************

app.use(express.static(__dirname + "/views/dist"));
// Handle root get
app.get("/*", function (req, res) {
  // save html files in the `views` folder...
  res.sendFile(__dirname + "/views/dist/index.html");
});

// start server
const port =
  process.env.NODE_ENV === "development"
    ? serverConfig.testPort
    : serverConfig.port;
console.log("Envorenment: ", process.env.NODE_ENV); // Terminal: export NODE_ENV=development

app.listen(port, function () {
  console.log("Server is running.. on Port ", port);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", reason.stack || reason);
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
process.on("uncaughtException", function (err) {
  console.log("Caught exception: ", err);
});

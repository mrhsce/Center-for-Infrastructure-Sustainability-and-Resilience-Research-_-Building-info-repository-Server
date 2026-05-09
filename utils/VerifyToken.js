const logger = require("./winstonLogger");
const jwtRun = require("./jwtRun");

const config = require("config");
const serverConfig = config.get("APAMAN.serverConfig");

const checkAddress = (address) => {
  if (
    address === `${serverConfig.SN}/user/login` ||
    address === `${serverConfig.SN}/admin/login` ||
    address === `${serverConfig.SN}/groupHead/login`
  ) {
    return true;
  }
  return false;
};

module.exports = {
  noToken: (req, res, next) => {
    next();
  },
  verifyToken: (req, res, next) => {
    if (checkAddress(req.originalUrl)) {
      next();
    } else {
      jwtRun.tokenValidation(req, "admin", (state, id, role) => {
        if (state) {
          logger.info("Verify Token API: %s", req.originalUrl);
          req.userId = id;
          req.role = role;
          next();
        } else {
          logger.error(
            "!!!Verify Token not have Token: Authorization Failed!!! => API: %s",
            req.originalUrl
          );
          return res.status(401).send("Authorization Failed!!!");
        }
      });
    }
  },
  verifySurveyorToken: (req, res, next) => {
    if (checkAddress(req.originalUrl)) {
      next();
    } else {
      jwtRun.tokenValidation(req, "surveyor", (state, id, role, clientType) => {
        if (state && role == "surveyor") {
          logger.info("Verify Token API: %s", req.originalUrl);
          req.userId = id;
          req.role = role;
          req.clientType = clientType;
          next();
        } else {
          logger.error(
            "!!!Verify Token not have Token: Authorization Failed!!! => API: %s",
            req.originalUrl
          );
          return res.status(401).send("Authorization Failed!!!");
        }
      });
    }
  },
  verifyGroupHeadToken: (req, res, next) => {
    if (checkAddress(req.originalUrl)) {
      next();
    } else {
      jwtRun.tokenValidation(req, "groupHead", (state, id, role) => {
        if (state && role == "groupHead") {
          logger.info("Verify Token API: %s", req.originalUrl);
          req.userId = id;
          req.role = role;
          next();
        } else {
          logger.error(
            "!!!Verify Token not have Token: Authorization Failed!!! => API: %s",
            req.originalUrl
          );
          return res.status(401).send("Authorization Failed!!!");
        }
      });
    }
  },
  verifyAdminToken: (req, res, next) => {
    if (checkAddress(req.originalUrl)) {
      next();
    } else {
      jwtRun.tokenValidation(req, "admin", (state, id, role) => {
        if (state && role == "admin") {
          logger.info("Verify Token API: %s", req.originalUrl);
          req.userId = id;
          req.role = role;
          next();
        } else {
          logger.error(
            "!!!Verify Token not have Token: Authorization Failed!!! => API: %s",
            req.originalUrl
          );
          return res.status(401).send("Authorization Failed!!!");
        }
      });
    }
  },
};

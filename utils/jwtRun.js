const fs = require("fs");
const jwt = require("jsonwebtoken");

const logger = require("./winstonLogger");

// use 'utf8' to get string instead of byte array  (512 bit key)
const privateKEY = fs.readFileSync(__dirname + "/private.key", "utf8");
const publicKEY = fs.readFileSync(__dirname + "/public.key", "utf8");
module.exports = {
  tokenValidation: (req, type, callBack) => {
    let token = req.headers["authorization"]; // Express headers are auto converted to lowercase
    logger.info("API: JWT token %j ", token);
    if (token && token.startsWith("Bearer ")) {
      // Remove Bearer from string
      token = token.slice(7, token.length);
    }
    if (token) {
      let tokenObj = verify(token, type);
      if (!tokenObj) {
        return callBack(false);
      } else {
        return callBack(
          true,
          tokenObj.userId,
          tokenObj.role,
          tokenObj.clientType
        );
      }
    } else {
      return callBack(false);
    }
  },
  sign: (payload) => {
    logger.info("API: JWT sign payload %j ", payload);
    let Options = {
      issuer: "Authorization/Resource/Monta server",
      subject: process.env.JWT_SUBJECT || "surveys@example.com",
      // audience: "Client_Identity" // this should be provided by client
    };

    // Token signing options
    const signOptions = {
      issuer: Options.issuer,
      subject: Options.subject,
      // audience:  Options.audience,
      expiresIn: payload.role == "surveyor" ? "90d" : "5h",
      algorithm: "RS256",
    };

    return jwt.sign(payload, privateKEY, signOptions);
  },
  decode: (token) => {
    return jwt.decode(token, { complete: true });
    //returns null if token is invalid
  },
};

function verify(token, type) {
  // logger.info('TokenValidation verify token is: %s ',token);
  vOption = {
    issuer: "Authorization/Resource/Monta server",
    subject: process.env.JWT_SUBJECT || "surveys@example.com",
    // audience: "Client_Identity" // this should be provided by client
  };

  let verifyOptions = {
    issuer: vOption.issuer,
    subject: vOption.subject,
    // audience:  vOption.audience,
    expiresIn: type == "surveyor" ? "90d" : "5h",
    algorithm: ["RS256"],
  };

  try {
    return jwt.verify(token, publicKEY, verifyOptions);
  } catch (err) {
    return false;
  }
}

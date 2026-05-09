const sqlite3 = require("sqlite3").verbose();
const betterSqlite3 = require("better-sqlite3");
const logger = require("./winstonLogger");

const EXECUTION_STATE_EDITABLE = 0;
const EXECUTION_STATE_TEMPORARILY_EDITABLE = 1;
const EXECUTION_STATE_LOCKED = 2;
const EXECUTION_STATE_FINALIZED = 3;
// Default state is 0, when locked it becomes 2, in this state if it becomes unlocked it goes back to 0 but if finalized
// goes to state 3, in this state it can be temporarily editable but this time it goes to state 2 only, in this state it
// returns to state 3 automatically after a specific time

class DatabaseHandler {
  constructor() {
    this.db = new sqlite3.Database("./main.db", (err) => {
      if (err) {
        logger.error("!!! sqlite Connection Failed !!! %j", err);
      } else {
        logger.info("***Connected to the sqlite database ***");
        // this.convertExecution();
      }
    });

    this.dbSync = new betterSqlite3("./main.db", null);
  }

  cleanEmptyImages(successCallback, failureCallback) {
    let getAllExecutions = `SELECT *  FROM Executions`;
    let updateSql = `UPDATE Executions SET resultJson=? WHERE id = ?`;

    let counter = 0;

    this.db.all(getAllExecutions, [], (err, rows) => {
      if (err) {
        logger.error(
          "!!! sqlite addingInformation-getAllExecutions error !!! %j",
          err
        );
        return failureCallback({ error: "group access" });
      }
      rows.map((o) => {
        let resultJson = JSON.parse(o.resultJson);

        resultJson.map((answer) => {
          if (answer.imageList) {
            let images = [];
            answer.imageList.map((image) => {
              if (image.uploaded && image.fileName) {
                images.push(image);
              } else {
                counter++;
              }
            });
            answer.imageList = images;
          }
        });

        this.db.run(updateSql, [JSON.stringify(resultJson), o.id], (err) => {
          if (err) {
            // logger.error("!!! sqlite addingInformation-updateExecution error !!! %j", err);
            return failureCallback({ error: "group access" });
          } else {
            // logger.info('*** sqlite addingInformation-updateExecution success ***');
          }
        });
      });
    });
    return successCallback(counter);
  }

  getEmptyImages(successCallback, failureCallback) {
    let getAllExecutions = `SELECT Executions.id, Executions.resultJson, User.name, User.family
            FROM Executions LEFT JOIN User ON Executions.ownerId = User.id`;

    let executions = this.dbSync.prepare(getAllExecutions).all();

    let results = [];

    executions.map((o) => {
      let resultJson = JSON.parse(o.resultJson);
      let images = [];
      resultJson.map((answer) => {
        if (answer.imageList) {
          let item = {
            id: o.id,
            owner: o.name + o.family,
            emptyImages: [],
            duplicateImages: [],
          };
          answer.imageList.map((image) => {
            if (!(image.uploaded && image.fileName)) {
              item.emptyImages.push(answer.index);
            }
            if (image.fileName) {
              if (images.length == 0) {
                images.push(image.fileName);
              } else {
                let checked = false;
                images.map((id) => {
                  if (id == image.fileName) {
                    item.duplicateImages.push(answer.index);
                    checked = true;
                  }
                });
                if (!checked) {
                  images.push(image.fileName);
                }
              }
            }
          });

          if (item.emptyImages.length > 0 && item.duplicateImages.length > 0) {
            results.push(item);
          }
        }
      });
    });
    return successCallback(results);
  }

  updateClientInfo(type, data, successCallback, failureCallback) {
    let updateSql = `UPDATE Clients SET versionName=?, versionCode=?, changeLog=? WHERE title = ?`;

    this.db.run(
      updateSql,
      [data.versionName, data.versionCode, data.changeLog, type],
      (err) => {
        if (err) {
          logger.error(`!!! sqlite updateClientInfo error !!! %j`, err);
          return failureCallback({ error: "update client failed" });
        } else {
          logger.info(`*** sqlite updateClientInfo success ***`);
          return successCallback();
        }
      }
    );
  }

  updateExecutionTableAddField(
    successCallback,
    failureCallback,
    name,
    type = "text",
    defaultValue = 0
  ) {
    let alterTable = `ALTER TABLE Executions ADD COLUMN ${name} ${type} DEFAULT '${defaultValue}'`;

    this.db.run(alterTable, [], (err) => {
      if (err) {
        // logger.error("!!! sqlite addingInformation-updateExecution error !!! %j", err);
        return failureCallback({ error: "alter table failed" });
      } else {
        // logger.info('*** sqlite addingInformation-updateExecution success ***');
      }
    });
    return successCallback();
  }

  convertExecution(successCallback, failureCallback) {
    let updateSql = `UPDATE Executions SET ownerId=53 WHERE ownerId = 48`;

    this.db.run(updateSql, [], (err) => {
      if (err) {
        logger.error(
          `!!! sqlite addingInformation-updateExecution error !!! %j`,
          err
        );
        return failureCallback({ error: "alter table failed" });
      } else {
        logger.info(`*** sqlite addingInformation-updateExecution success ***`);
        return successCallback();
      }
    });
  }

  // convertExecution(){
  //     let getAllExecutions = `SELECT *  FROM Executions`;
  //
  //     this.db.all(getAllExecutions, [], (err, rows) => {
  //         if (err) {
  //             logger.error("!!! sqlite addingInformation-getAllExecutions error !!! %j", err);
  //             return;
  //         }
  //         rows.map(o => {
  //             let updateSql = `UPDATE Executions SET resultJson=? WHERE id = ?`;
  //
  //             let resultJson = JSON.parse(o.resultJson);
  //             resultJson[0].note = o.note;
  //             resultJson[0].imageList = images;
  //
  //             this.db.run(updateSql, [JSON.stringify(resultJson), o.id], (err) => {
  //                 if (err) {
  //                     logger.error(`!!! sqlite addingInformation-updateExecution ${o.id} error !!! %j`, err);
  //                 }
  //                 else{
  //                     logger.info(`*** sqlite addingInformation-updateExecution ${o.id} success ***`);
  //                 }
  //             });
  //         });
  //         logger.info('*** sqlite addingInformation-updateExecution end ***');
  //     });
  // }

  //***************************** ACCESS CONTROL FUNCTIONS ***************************************

  checkUserGroupAccessForGroupHead(
    userId,
    groupId,
    successCallback,
    failureCallback
  ) {
    let sql = `SELECT * FROM UserGroup WHERE adminId = ${userId} AND id=${groupId}`;

    this.db.get(sql, [], (err, group) => {
      if (err || !group) {
        logger.error("!!! sqlite checkUserGroupAccess error !!! %j", err);
        return failureCallback({ error: "group access" });
      }
      return successCallback();
    });
  }

  checkSurveyAccessForGroupHead(
    userId,
    surveyId,
    successCallback,
    failureCallback
  ) {
    let sql = `SELECT * FROM UserGroup INNER JOIN UserGroupSurveyAccess ON UserGroup.id = UserGroupSurveyAccess.userGroupId 
            INNER JOIN Surveys ON Surveys.id = UserGroupSurveyAccess.surveyId WHERE Surveys.published = 1 AND UserGroup.adminId = ${userId} AND
             UserGroupSurveyAccess.surveyId = ${surveyId}`;

    this.db.get(sql, [], (err, group) => {
      if (err || !group) {
        logger.error("!!! sqlite checkSurveyAccess error !!! %j", err);
        return failureCallback({ error: "survey access" });
      }
      return successCallback();
    });
  }

  checkExecutionAccessForGroupHead(
    userId,
    executionId,
    successCallback,
    failureCallback
  ) {
    let sql = `SELECT * FROM UserGroup INNER JOIN UserInGroup ON UserGroup.id = UserInGroup.userGroupId INNER JOIN
            Executions ON Executions.ownerId = UserInGroup.userId WHERE UserGroup.adminId = ${userId} AND Executions.id = ${executionId}`;

    this.db.get(sql, [], (err, group) => {
      if (err || !group) {
        logger.error(
          "!!! sqlite checkExecutionAccessForGroupHead error !!! %j",
          err
        );
        return failureCallback({ error: "execution access" });
      }
      return successCallback();
    });
  }

  //**********************************************************************************************

  authenticateUser(username, passwordHash, successCallback, failureCallback) {
    let sql = `SELECT *  FROM User WHERE username  = ? and password = ?`;

    // first row only
    this.db.get(sql, [username, passwordHash], (err, row) => {
      if (err) {
        logger.error("!!! sqlite authenticateUser error !!! %j", err);
      }
      return row ? successCallback(row) : failureCallback();
    });
  }

  authenticateAdmin(username, passwordHash, successCallback, failureCallback) {
    let sql = `SELECT *  FROM User WHERE username  = ? and password = ? and role = 'admin'`;

    // first row only
    this.db.get(sql, [username, passwordHash], (err, row) => {
      if (err) {
        logger.error("!!! sqlite authenticateUser error !!! %j", err);
      }
      return row ? successCallback(row) : failureCallback();
    });
  }

  authenticateGroupHead(
    username,
    passwordHash,
    successCallback,
    failureCallback
  ) {
    let checkUser = `SELECT *  FROM User WHERE username  = ? and password = ?`;
    let getGroups = `SELECT *  FROM UserGroup WHERE adminId  = ?`;

    // first row only
    this.db.get(checkUser, [username, passwordHash], (err, user) => {
      if (err || !user) {
        logger.error("!!! sqlite authenticateGroupHead error !!! %j", err);
        return failureCallback({ error: "user" });
      }
      this.db.all(getGroups, [user.id], (err, groups) => {
        if (err || !groups || !groups.length > 0) {
          logger.error(
            "!!! sqlite authenticateGroupHead userGroup error !!! %j",
            err
          );
          return failureCallback({ error: "userGroup" });
        }
        return successCallback(user, groups);
      });
    });
  }

  createUser(user, successCallback, failureCallback) {
    let sql = `INSERT INTO User(name, family, username, password, role) VALUES(?, ?, ?, ?, ?)`;

    this.db.run(
      sql,
      [user.name, user.family, user.username, user.password, user.role],
      (err) => {
        if (err) {
          logger.error("!!! sqlite createUser error !!! %j", err);
          return failureCallback(err);
        }
        return successCallback();
      }
    );
  }

  deleteUser(userId, successCallback, failureCallback) {
    let sql = `DELETE FROM User WHERE id=?`;

    this.db.run(sql, [userId], (err) => {
      if (err) {
        logger.error("!!! sqlite deleteUser error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  changeUserRole(id, role, successCallback, failureCallback) {
    let sql = `UPDATE User SET role=? WHERE id=?`;

    this.db.run(sql, [role, id], (err) => {
      if (err) {
        logger.error("!!! sqlite changeSurveyStatus error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  changeUserPassword(id, newPassword, successCallback, failureCallback) {
    let sql = `UPDATE User SET password=? WHERE id=?`;

    this.db.run(sql, [newPassword, id], (err) => {
      if (err) {
        logger.error("!!! sqlite changeUserPassword error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  changeUserPasswordAfterCheck(
    id,
    oldPassword,
    newPassword,
    successCallback,
    failureCallback
  ) {
    let sql = `SELECT *  FROM User WHERE id  = ? and password = ?`;

    // first row only
    this.db.get(sql, [id, oldPassword], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite changeUserPasswordAfterCheck error !!! %j",
          err
        );
        return failureCallback(err);
      } else {
        let sql = `UPDATE User SET password=? WHERE id=?`;

        this.db.run(sql, [newPassword, id], (err) => {
          if (err) {
            logger.error(
              "!!! sqlite changeUserPasswordAfterCheck error !!! %j",
              err
            );
            return failureCallback(err);
          }
          return successCallback();
        });
      }
    });
  }

  getUser(id) {
    let userSql = `SELECT id, name, family, username, role  FROM User WHERE id = ?`;
    let executionSql = `SELECT Executions.id, Executions.title, Executions.surveyId, Surveys.title AS surveyTitle
            FROM Executions LEFT JOIN Surveys ON Executions.surveyId = Surveys.id where ownerId = ?`;
    let userGroupSql = `SELECT UserGroup.id, UserGroup.title, UserGroup.adminId FROM UserInGroup LEFT JOIN UserGroup
            ON UserInGroup.userGroupId = UserGroup.id where UserInGroup.userId = ?`;

    let user = this.dbSync.prepare(userSql).get(id);

    if (user) {
      let executions = this.dbSync.prepare(executionSql).all(user.id);
      user.executions = executions;

      let userGroups = this.dbSync.prepare(userGroupSql).all(user.id);
      userGroups.map((userGroup) => {
        if (userGroup.adminId == user.id) {
          userGroup.isAdmin = true;
        }
      });
      user.userGroups = userGroups;
    }

    return user;
  }

  getClientVersion(client) {
    let userSql = `SELECT title, versionName, versionCode, changeLog FROM Clients WHERE title = ?`;

    return this.dbSync.prepare(userSql).get(client);
  }

  getAllUsers() {
    let usersSql = `SELECT id, name, family, username, role  FROM User`;
    let executionSql = `SELECT id  FROM Executions where ownerId = ?`;

    let users = this.dbSync.prepare(usersSql).all();

    users.map((user) => {
      let executions = this.dbSync.prepare(executionSql).all(user.id);
      user.executionCount = executions.length;
    });

    return users;
  }

  getAllUsersByFilter(filter, callback) {
    let usersSql = `SELECT id, name, family, username, role  FROM User WHERE name LIKE '%${filter}%' OR
            family LIKE '%${filter}%' OR username LIKE '%${filter}%'`;
    let executionSql = `SELECT id  FROM Executions where ownerId = ?`;

    let users = this.dbSync.prepare(usersSql).all();

    users.map((user) => {
      let executions = this.dbSync.prepare(executionSql).all(user.id);
      user.executionCount = executions.length;
    });

    return users;
  }

  getAllSurveysForUser(callback, userId, status = null) {
    let sql =
      status == "published"
        ? `SELECT Surveys.id as id, Surveys.title as title, Surveys.description as description,
         Surveys.conditional as conditional ,Surveys.published as published, COUNT(DISTINCT Executions.id) as executionCount FROM Surveys
         INNER JOIN UserGroupSurveyAccess ON UserGroupSurveyAccess.surveyId = Surveys.id INNER JOIN UserGroup On 
         UserGroupSurveyAccess.userGroupId = UserGroup.id AND UserGroupSurveyAccess.published = 1 INNER JOIN 
         UserInGroup ON UserInGroup.userGroupId = UserGroup.id AND UserInGroup.userId = ${userId} LEFT JOIN Executions ON 
         Executions.surveyId = Surveys.id AND Executions.ownerId = ${userId} WHERE Surveys.published=1 GROUP BY Surveys.id`
        : `SELECT Surveys.id as id, Surveys.title as title, Surveys.description as description,
                    Surveys.conditional as conditional, Surveys.published as published, COUNT(DISTINCT Executions.id) as executionCount FROM Surveys
                    LEFT JOIN Executions ON Executions.surveyId = Surveys.id AND Executions.ownerId = ${userId} GROUP BY Surveys.id`;

    this.db.all(sql, [], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllSurveys error !!! %j", err);
      }
      return callback(rows);
    });
  }

  getAllSurveys(filter, callback) {
    let sql = `SELECT Surveys.id as id, Surveys.title as title, Surveys.description as description,
       Surveys.published as published, Surveys.conditional as conditional, COUNT(Executions.id) as executionCount FROM Surveys
         LEFT JOIN Executions ON Executions.surveyId = Surveys.id
          WHERE Surveys.title LIKE '%${filter}%' OR  Surveys.description LIKE '%${filter}%'
          GROUP BY Surveys.id`;

    this.db.all(sql, [], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllSurveys error !!! %j", err);
      }
      return callback(rows);
    });
  }

  getAllUserGroupsForGroupHead(userId, callback) {
    let sql = `SELECT * FROM UserGroup WHERE adminId = ${userId}`;

    let getUsers = `SELECT User.id AS id, User.name AS name, User.family AS family, User.username AS username  FROM UserInGroup
            LEFT JOIN User ON UserInGroup.userId = User.id WHERE UserInGroup.userGroupId  = ?`;
    let getSurveys = `SELECT UserGroupSurveyAccess.published AS published, Surveys.id AS id, Surveys.title AS title,
            Surveys.description AS description FROM UserGroupSurveyAccess LEFT JOIN Surveys ON
             UserGroupSurveyAccess.surveyId = Surveys.id WHERE userGroupId  = ?`;

    let userGroups = this.dbSync.prepare(sql).all();

    userGroups.map((group) => {
      let users = this.dbSync.prepare(getUsers).all(group.id);
      users.map((user) => {
        if (user.id == group.adminId) {
          user.admin = true;
          group.adminName = user.name + " " + user.family;
        }
      });

      group.users = users;
      group.surveys = this.dbSync.prepare(getSurveys).all(group.id);
    });

    return userGroups;
  }

  getAllUserGroups() {
    let sql = `SELECT * FROM UserGroup`;
    let getUsers = `SELECT User.id AS id, User.name AS name, User.family AS family, User.username AS username  FROM UserInGroup
            LEFT JOIN User ON UserInGroup.userId = User.id WHERE UserInGroup.userGroupId  = ?`;
    let getSurveys = `SELECT UserGroupSurveyAccess.published AS published, Surveys.id AS id, Surveys.title AS title,
            Surveys.description AS description FROM UserGroupSurveyAccess LEFT JOIN Surveys ON
             UserGroupSurveyAccess.surveyId = Surveys.id WHERE userGroupId  = ?`;

    let userGroups = this.dbSync.prepare(sql).all();

    userGroups.map((group) => {
      let users = this.dbSync.prepare(getUsers).all(group.id);
      users.map((user) => {
        if (user.id == group.adminId) {
          user.admin = true;
          group.adminName = user.name + " " + user.family;
        }
      });

      group.users = users;
      group.surveys = this.dbSync.prepare(getSurveys).all(group.id);
    });

    return userGroups;
  }

  getAllSurveysForGroup(groupId, callback) {
    let sql = `SELECT Surveys.id as id, Surveys.title as title, Surveys.description as description,
       UserGroupSurveyAccess.published as published, COUNT(DISTINCT Executions.id) as executionCount FROM Surveys INNER JOIN
        UserGroupSurveyAccess On UserGroupSurveyAccess.surveyId = Surveys.id AND UserGroupSurveyAccess.userGroupId = ${groupId}
         LEFT JOIN Executions ON Executions.surveyId = Surveys.id INNER JOIN UserInGroup ON
          Executions.ownerId = UserInGroup.userId AND UserInGroup.userGroupId = ${groupId} GROUP BY Surveys.id`;

    this.db.all(sql, [], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllSurveysForGroup error !!! %j", err);
      }
      return callback(rows);
    });
  }

  getUserGroup(groupId) {
    let getSql = `SELECT *  FROM UserGroup WHERE id  = ?`;
    let getUsers = `SELECT User.id AS id, User.name AS name, User.family AS family, User.username AS username  FROM UserInGroup
            LEFT JOIN User ON UserInGroup.userId = User.id WHERE UserInGroup.userGroupId  = ?`;
    let getSurveys = `SELECT UserGroupSurveyAccess.published AS published, Surveys.id AS id, Surveys.title AS title,
            Surveys.description AS description FROM UserGroupSurveyAccess LEFT JOIN Surveys ON
             UserGroupSurveyAccess.surveyId = Surveys.id WHERE userGroupId  = ?`;

    let userGroups = this.dbSync.prepare(getSql).get(groupId);

    if (userGroups) {
      let users = this.dbSync.prepare(getUsers).all(userGroups.id);
      users.map((user) => {
        if (user.id == userGroups.adminId) {
          user.admin = true;
        }
      });

      userGroups.users = users;
      userGroups.surveys = this.dbSync.prepare(getSurveys).all(userGroups.id);
    }

    return userGroups;
  }

  getSomeExecutionsOfSurvey(surveyId, from, to, increasing = 0, callback) {
    let sql = `SELECT Executions.id, Executions.surveyId, Executions.title, Executions.resultJson,
                    Executions.questionCount, Executions.status, Executions.ownerId, Executions.information, Surveys.title as surveyTitle, Surveys.conditional as conditional,
             User.name as surveyorName, User.family as surveyorFamily FROM Executions LEFT JOIN User ON Executions.ownerId = User.id LEFT JOIN
                Surveys ON Executions.surveyId = Surveys.id WHERE Executions.surveyId=? ORDER BY
        Executions.id ${increasing == 1 ? "ASC" : "DESC"} LIMIT ${
      to - from
    } OFFSET ${from}`;

    this.db.all(sql, [surveyId], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllExecutionsOfSurveys error !!! %j", err);
      }
      rows.map((o) => {
        o.information = JSON.parse(o.information);
        let results = JSON.parse(o.resultJson);
        o.questionCount = parseInt(o.questionCount);
        delete o.resultJson;
        o.noteCount = 0;
        o.imageCount = 0;
        o.flagCount = 0;
        o.answeredCount = 0;

        results.map((question) => {
          if (question.hasFlag) {
            o.flagCount++;
          }
          if (question.note) {
            o.noteCount++;
          }
          if (question.imageList) {
            o.imageCount += question.imageList.length;
          }
          if (question.answer) {
            o.answeredCount++;
          }
        });
      });
      return callback(rows);
    });
  }

  getLastHundredExecutions(increasing, callback, userId = null) {
    console.log(userId);
    let sql = userId
      ? `SELECT Executions.id, Executions.surveyId, Executions.title, Executions.resultJson,
                    Executions.questionCount, Executions.status, Executions.ownerId, Executions.information, Surveys.title as surveyTitle, Surveys.conditional as conditional
                     FROM Executions LEFT JOIN
                Surveys ON Executions.surveyId = Surveys.id WHERE  Executions.ownerId = ${userId}
ORDER BY Executions.id DESC LIMIT 100`
      : `SELECT Executions.id, Executions.surveyId, Executions.title, Executions.resultJson,
                    Executions.questionCount, Executions.status, Executions.ownerId, Executions.information, Surveys.title as surveyTitle, Surveys.conditional as conditional,
             User.name as surveyorName, User.family as surveyorFamily FROM Executions LEFT JOIN User ON Executions.ownerId = User.id LEFT JOIN
                Surveys ON Executions.surveyId = Surveys.id  ORDER BY Executions.id DESC LIMIT 100`;
    this.db.all(sql, [], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getLastHundredExecutions error !!! %j", err);
      }
      rows = rows.reverse();
      let counter = 0;
      rows.map((o) => {
        o.information = JSON.parse(o.information);
        let results = JSON.parse(o.resultJson);
        o.resultJson = null;
        o.noteCount = 0;
        o.imageCount = 0;
        o.flagCount = 0;
        o.answeredCount = 0;
        o.index = counter + 1;
        counter++;

        results.map((question) => {
          if (question.hasFlag) {
            o.flagCount++;
          }
          if (question.note) {
            o.noteCount++;
          }
          if (question.imageList) {
            o.imageCount += question.imageList.length;
          }
          if (question.answer) {
            o.answeredCount++;
          }
        });
      });
      return callback(increasing == 0 ? rows.reverse() : rows);
    });
  }

  getSomeExecutionsOfSurveyForUser(
    surveyId,
    from,
    to,
    increasing,
    userId,
    callback
  ) {
    let sql = `SELECT Executions.id, Executions.surveyId, Executions.title, Executions.resultJson, Surveys.conditional as conditional,
                    Executions.questionCount, Executions.status, Executions.ownerId, Executions.information, Surveys.title as surveyTitle,
             User.name as surveyorName, User.family as surveyorFamily FROM Executions LEFT JOIN User ON Executions.ownerId = User.id LEFT JOIN
                Surveys ON Executions.surveyId = Surveys.id WHERE Executions.surveyId=? AND Executions.ownerId=? ORDER BY
        Executions.id ${increasing == 1 ? "ASC" : "DESC"} LIMIT ${
      to - from
    } OFFSET ${from}`;

    this.db.all(sql, [surveyId, userId], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllExecutionsOfSurveys error !!! %j", err);
      }
      rows.map((o) => {
        o.information = JSON.parse(o.information);
        let results = JSON.parse(o.resultJson);
        o.questionCount = parseInt(o.questionCount);
        delete o.resultJson;
        o.noteCount = 0;
        o.imageCount = 0;
        o.flagCount = 0;
        o.answeredCount = 0;

        if (o.ownerId == userId) {
          delete o.surveyorName;
          delete o.surveyorFamily;
        }

        // o.editable = false;

        results.map((question) => {
          if (question.hasFlag) {
            o.flagCount++;
          }
          if (question.note) {
            o.noteCount++;
          }
          if (question.imageList) {
            o.imageCount += question.imageList.length;
          }
          if (question.answer) {
            o.answeredCount++;
          }
        });
      });
      return callback(rows);
    });
  }

  getAllExecutionsOfSurveysForGroup(
    groupId,
    surveyId,
    callback,
    isComplete = false
  ) {
    let sql = isComplete
      ? `SELECT * FROM Executions  LEFT JOIN User ON Executions.ownerId = User.id INNER JOIN UserInGroup ON
                Executions.ownerId = UserInGroup.userId AND UserInGroup.userGroupId = ? WHERE surveyId=?`
      : `SELECT id, title, information, ownerId FROM Executions INNER JOIN UserInGroup ON
                Executions.ownerId = UserInGroup.userId AND UserInGroup.userGroupId = ? WHERE surveyId=?`;

    this.db.all(sql, [groupId, surveyId], (err, rows) => {
      if (err) {
        logger.error(
          "!!! sqlite getAllExecutionsOfSurveysForGroup error !!! %j",
          err
        );
      }
      rows.map((o) => {
        o.information = JSON.parse(o.information);
      });
      return callback(rows.reverse());
    });
  }

  getAllCompleteExecutionsOfSurveys(surveyId, callback, userId = null) {
    let sql = userId
      ? `SELECT * FROM Executions WHERE surveyId=? AND ownerId= ${userId}`
      : `SELECT * FROM Executions WHERE surveyId=?`;

    this.db.all(sql, [surveyId], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getAllExecutionsOfSurveys error !!! %j", err);
        return;
      }
      this.getSurvey(surveyId, (survey) => {
        rows.map((o) => {
          o.resultJson = survey.conditional
            ? JSON.parse(o.resultJson)
            : this.enhanceResultJson(
                JSON.parse(o.resultJson),
                JSON.parse(survey.body)
              );
        });
        return callback(rows.reverse());
      });
    });
  }

  getExecution(id, callback, errorCallback) {
    let sql = `SELECT Executions.id, Executions.surveyId, Executions.title, Executions.resultJson, Executions.questionCount,
            Executions.status, Executions.ownerId, Executions.information, Surveys.title as surveyTitle, Surveys.sections as sections,
            Surveys.conditional as conditional, Surveys.body as surveyQuestions, User.name as surveyorName, 
            User.family as surveyorFamily FROM Executions LEFT JOIN User ON Executions.ownerId = User.id LEFT JOIN
                Surveys ON Executions.surveyId = Surveys.id WHERE Executions.id=?`;

    // first row only
    this.db.get(sql, [id], (err, row) => {
      if (err || !row) {
        logger.error("!!! sqlite getExecution error !!! %j", err);
        errorCallback();
        return;
      }
      try {
        row.sections = JSON.parse(row.sections);
      } catch (e) {
        logger.error(
          "!!! sqlite getSurvey error in parsing sections !!! %j",
          e
        );
        row.sections = null;
      }

      row.information = JSON.parse(row.information);
      row.resultJson = row.conditional
        ? JSON.parse(row.resultJson)
        : this.enhanceResultJson(
            JSON.parse(row.resultJson),
            JSON.parse(row.surveyQuestions)
          );

      delete row.surveyQuestions;

      row.imageCount = 0;

      row.resultJson.map((question) => {
        // if(question.hasFlag){
        //     o.flagCount ++;
        // }
        // if(question.note){
        //     o.noteCount++;
        // }
        if (question.imageList) {
          row.imageCount += question.imageList.length;
        }
        // if(question.answer){
        //     o.answeredCount ++;
        // }
      });
      return callback(row);
    });
  }

  setExecutionStatus(id, newStatus, successCallback, errorCallback) {
    let executionSql = `SELECT *  FROM Executions WHERE id = ?`;

    let execution = this.dbSync.prepare(executionSql).get(id);

    if (!execution) {
      return errorCallback("اجرای مورد نظر وجود ندارد");
    }
    if (newStatus != 0 && newStatus != 1 && newStatus != 2 && newStatus != 3) {
      return errorCallback("invalid status");
    }

    let sql = `UPDATE Executions SET status=? WHERE id = ?`;

    this.db.run(sql, [newStatus, id], (err) => {
      if (err) {
        return errorCallback("Database Error");
      }
      return successCallback();
    });
  }

  getSurveyFunctions(id, callback) {
    let sql = `SELECT * FROM Functions WHERE surveyId=?`;

    this.db.all(sql, [id], (err, rows) => {
      if (err) {
        logger.error("!!! sqlite getSurveyFunctions error !!! %j", err);
      }
      return callback(rows);
    });
  }

  reduceResultJson(resultJson) {
    let newResult = [];
    resultJson.map((o) => {
      let item = {};
      if (o.answer) {
        item.answer = o.answer;
      }
      if (o.note) {
        item.note = o.note;
      }
      if (o.hasFlag) {
        item.hasFlag = o.hasFlag;
      }
      if (o.imageList && o.imageList.length > 0) {
        item.imageList = o.imageList;
      }
      newResult.push(item);
    });
    return newResult;
  }

  enhanceResultJson(resultJson, surveyQuestions) {
    let newResult = [];
    resultJson.map((o, index) => {
      let i = { ...o, ...surveyQuestions.questions[index], index: index + 1 };
      if (i.selectionList) {
        i.selectionList.map((o, index) => {
          o.index = index;
        });
      }
      newResult.push(i);
    });
    return newResult;
  }

  addOrUpdateExecution(userId, execution, successCallback, failureCallback) {
    let id = execution.id;
    if (id) {
      let executionSql = `SELECT *  FROM Executions WHERE id = ?`;
      let execution = this.dbSync.prepare(executionSql).get(id);

      if (execution.status != 0 && execution.status != 1) {
        return failureCallback("Locked execution");
      }
    }
    let sql = execution.id
      ? `UPDATE Executions SET title=?, information=?, surveyId=?, resultJson=?, questionCount=? WHERE id = ?`
      : `INSERT INTO Executions(title, information, surveyId, resultJson, questionCount, ownerId)
            VALUES(?, ?, ?, ?, ?, ?)`;

    this.getSurvey(execution.surveyId, (survey) => {
      let data = execution.id
        ? [
            execution.title,
            JSON.stringify(execution.information),
            execution.surveyId,
            JSON.stringify(
              survey.conditional
                ? execution.resultJson
                : this.reduceResultJson(execution.resultJson)
            ),
            execution.questionCount,
            execution.id,
          ]
        : [
            execution.title,
            JSON.stringify(execution.information),
            execution.surveyId,
            JSON.stringify(
              survey.conditional
                ? execution.resultJson
                : this.reduceResultJson(execution.resultJson)
            ),
            execution.questionCount,
            userId,
          ];

      this.db.run(sql, data, (err) => {
        if (err) {
          execution.id
            ? logger.error("!!! sqlite updateExecution error !!! %j", err)
            : logger.error("!!! sqlite addNewExecution error !!! %j", err);
          return failureCallback(err);
        }
        return successCallback();
      });
    });
  }

  addMultipleNewExecution(userId, executions, callBack) {
    let results = [];
    let runs = 0;
    executions.map((o) => {
      results.push(false);
    });
    let sqlCreate = `INSERT INTO Executions(title, information, surveyId, resultJson, questionCount, ownerId)
            VALUES(?, ?, ?, ?, ?, ?)`;

    let sqlUpdate = `UPDATE Executions SET title=?, information=?, surveyId=?, resultJson=?, questionCount=? WHERE id = ?`;

    executions.map((execution, index) => {
      let execute = true;
      if (execution.id) {
        let executionSql = `SELECT *  FROM Executions WHERE id = ?`;

        let exec = this.dbSync.prepare(executionSql).get(execution.id);
        if (exec.status != 0 && exec.status != 1) {
          runs++;
          execute = false;
        }
      }
      if (execute) {
        this.getSurvey(execution.surveyId, (survey) => {
          this.db.run(
            execution.id ? sqlUpdate : sqlCreate,
            execution.id
              ? [
                  execution.title,
                  JSON.stringify(execution.information),
                  execution.surveyId,
                  JSON.stringify(
                    survey.conditional
                      ? execution.resultJson
                      : this.reduceResultJson(execution.resultJson)
                  ),
                  execution.questionCount,
                  execution.id,
                ]
              : [
                  execution.title,
                  JSON.stringify(execution.information),
                  execution.surveyId,
                  JSON.stringify(
                    survey.conditional
                      ? execution.resultJson
                      : this.reduceResultJson(execution.resultJson)
                  ),
                  execution.questionCount,
                  userId,
                ],
            (err) => {
              if (!err) {
                results[index] = true;
              }
              runs++;
              if (runs >= executions.length) {
                return callBack(results);
              }
            }
          );
        });
      }
    });
  }

  getSurvey(id, callback, isJson = false) {
    let sql = `SELECT Surveys.id as id, Surveys.title as title, Surveys.description as description,
       Surveys.conditional as conditional, Surveys.tutorial as tutorial, Surveys.tutorialFile as tutorialFile,
                          Surveys.published as published, Surveys.sections as sections, Surveys.body as body,
       COUNT(Executions.id) as executionCount FROM Surveys LEFT JOIN Executions ON Executions.surveyId = Surveys.id where Surveys.id=? GROUP BY Surveys.id`;

    // first row only
    this.db.get(sql, [id], (err, row) => {
      if (err) {
        logger.error("!!! sqlite getSurvey error !!! %j", err);
      }

      // if(row.conditional = 0){
      //     row.body = JSON.parse(row.body);
      // }

      if (isJson) {
        try {
          row.sections = JSON.parse(row.sections);
        } catch (e) {
          logger.error(
            "!!! sqlite getSurvey error in parsing sections !!! %j",
            e
          );
          row.sections = null;
        }
      }
      if (isJson && !row.conditional) {
        try {
          row.body = JSON.parse(row.body);
          row.body.questions.map((o, index) => {
            o.index = index + 1;
          });
        } catch (e) {
          logger.error(
            "!!! sqlite getSurvey error in parsing body !!! %j",
            row.conditional
          );
          row.body = null;
        }
      }
      if (row.tutorial) {
        row.tutorial = JSON.parse(row.tutorial);
      }
      return callback(row);
    });
  }

  addOrUpdateSurvey(survey, successCallback, failureCallback) {
    let sql = "";
    let body = survey.body;
    let tutorial = survey.tutorial;
    if (tutorial) {
      tutorial = JSON.stringify(tutorial);
    }

    sql = survey.id
      ? `UPDATE Surveys SET title =? , description=? , tutorial = ?, tutorialFile = ?, body=? , published=?, sections=?, conditional=? WHERE id = ?`
      : `INSERT INTO Surveys(title, description, tutorial, tutorialFile, body, published, sections, conditional) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;

    let data = survey.id
      ? [
          survey.title,
          survey.description,
          tutorial,
          survey.tutorialFile,
          body,
          survey.published,
          survey.sections,
          survey.conditional,
          survey.id,
        ]
      : [
          survey.title,
          survey.description,
          tutorial,
          survey.tutorialFile,
          body,
          survey.published,
          survey.sections,
          survey.conditional,
        ];

    this.db.run(sql, data, (err) => {
      if (err) {
        logger.error("!!! sqlite createOrUpdateSurvey error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  addOrUpdateUserGroup(userGroup, successCallback, failureCallback) {
    let sqlCheck = `SELECT *  FROM User WHERE id  = ?`;

    // first row only
    this.db.get(sqlCheck, [userGroup.adminId], (err, row) => {
      if (err || !row) {
        logger.error("!!! sqlite addOrUpdateUserGroup error !!! %j", err);
        return failureCallback({ error: "user" });
      } else {
        if (userGroup.id) {
          //Update
          let userGroupCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;
          this.db.get(userGroupCheck, [userGroup.id], (err, row) => {
            if (err || !row) {
              logger.error("!!! sqlite addOrUpdateUserGroup error !!! %j", err);
              return failureCallback({ error: "userGroup" });
            }
            let sql = `UPDATE UserGroup SET title =? , adminId=? WHERE id = ?`;
            this.db.run(
              sql,
              [userGroup.title, userGroup.adminId, userGroup.id],
              (err) => {
                if (err) {
                  logger.error(
                    "!!! sqlite addOrUpdateUserGroup error !!! %j",
                    err
                  );
                  return failureCallback({ error: "update failed" });
                }
                return successCallback(userGroup.id);
              }
            );
          });
        } else {
          //Create
          let sql = `INSERT INTO UserGroup(title, adminId) VALUES(?, ?)`;
          this.db.run(
            sql,
            [userGroup.title, userGroup.adminId],
            function (err) {
              if (err) {
                logger.error(
                  "!!! sqlite addOrUpdateUserGroup error !!! %j",
                  err
                );
                return failureCallback({ error: "insertion failed" });
              }
              return successCallback(this.lastID);
            }
          );
        }
      }
    });
  }

  deleteUserGroup(id, successCallback, failureCallback) {
    let sqlCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;

    // first row only
    this.db.get(sqlCheck, [id], (err, row) => {
      if (err || !row) {
        logger.error("!!! sqlite deleteUserGroup check error !!! %j", err);
        return failureCallback(err);
      } else {
        let sql = `DELETE FROM UserGroupSurveyAccess WHERE userGroupId=?`;
        let sql1 = `DELETE FROM UserInGroup WHERE userGroupId=?`;
        let sql2 = `DELETE FROM UserGroup WHERE id=?`;

        this.db.run(sql, [id], (err) => {
          if (err) {
            logger.error(
              "!!! sqlite deleteUserGroup UserInGroup error !!! %j",
              err
            );
            return failureCallback(err);
          }
          this.db.run(sql1, [id], (err) => {
            if (err) {
              logger.error(
                "!!! sqlite deleteUserGroup UserInGroup error !!! %j",
                err
              );
              return failureCallback(err);
            }
            this.db.run(sql2, [id], (err) => {
              if (err) {
                logger.error("!!! sqlite deleteUserGroup error !!! %j", err);
                return failureCallback(err);
              }
              return successCallback();
            });
          });
        });
      }
    });
  }

  addUserToUserGroup(userGroupId, userId, successCallback, failureCallback) {
    let userGroupCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;
    let userCheck = `SELECT *  FROM User WHERE id  = ?`;

    // first row only
    this.db.get(userGroupCheck, [userGroupId], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite addUserToUserGroup  userGroup check error !!! %j",
          err
        );
        return failureCallback({ error: "userGroup" });
      }
      this.db.get(userCheck, [userId], (err, row) => {
        if (err || !row) {
          logger.error(
            "!!! sqlite addUserToUserGroup user check error !!! %j",
            err
          );
          return failureCallback({ error: "user" });
        }

        let sql = `INSERT INTO UserInGroup(userGroupId, userId) VALUES(?, ?)`;
        this.db.run(sql, [userGroupId, userId], (err) => {
          if (err) {
            logger.error("!!! sqlite addUserToUserGroup error !!! %j", err);
            return failureCallback({ error: "already exists" });
          }
          return successCallback();
        });
      });
    });
  }

  addSurveyToUserGroup(
    userGroupId,
    surveyId,
    successCallback,
    failureCallback
  ) {
    let userGroupCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;
    let surveyCheck = `SELECT *  FROM Surveys WHERE id  = ?`;

    // first row only
    this.db.get(userGroupCheck, [userGroupId], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite addSurveyToUserGroup  userGroup check error !!! %j",
          err
        );
        return failureCallback({ error: "userGroup" });
      }
      this.db.get(surveyCheck, [surveyId], (err, row) => {
        if (err || !row) {
          logger.error(
            "!!! sqlite addSurveyToUserGroup surveyId check error !!! %j",
            err
          );
          return failureCallback({ error: "survey" });
        }

        let sql = `INSERT INTO UserGroupSurveyAccess(userGroupId, surveyId, published) VALUES(?, ?, ?)`;
        this.db.run(sql, [userGroupId, surveyId, 1], (err) => {
          if (err) {
            logger.error("!!! sqlite addSurveyToUserGroup error !!! %j", err);
            return failureCallback({ error: "already exists" });
          }
          return successCallback();
        });
      });
    });
  }

  removeSurveyFromUserGroup(
    userGroupId,
    surveyId,
    successCallback,
    failureCallback
  ) {
    let userGroupCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;
    let surveyCheck = `SELECT *  FROM Surveys WHERE id  = ?`;
    let existsCheck = `SELECT *  FROM UserGroupSurveyAccess WHERE userGroupId  = ? AND surveyId  = ?`;

    // first row only
    this.db.get(userGroupCheck, [userGroupId], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite removeSurveyFromUserGroup  userGroup check error !!! %j",
          err
        );
        return failureCallback({ error: "userGroup" });
      }
      this.db.get(surveyCheck, [surveyId], (err, row) => {
        if (err || !row) {
          logger.error(
            "!!! sqlite removeSurveyFromUserGroup survey check error !!! %j",
            err
          );
          return failureCallback({ error: "survey" });
        }
        this.db.get(existsCheck, [userGroupId, surveyId], (err, row) => {
          if (err || !row) {
            logger.error(
              "!!! sqlite removeSurveyFromUserGroup exists check error !!! %j",
              err
            );
            return failureCallback({ error: "not exists" });
          }
          let sql = `DELETE FROM UserGroupSurveyAccess WHERE userGroupId  = ? AND surveyId  = ?`;
          this.db.run(sql, [userGroupId, surveyId], (err) => {
            if (err) {
              logger.error(
                "!!! sqlite removeSurveyFromUserGroup error !!! %j",
                err
              );
              return failureCallback({ error: "error" });
            }
            return successCallback();
          });
        });
      });
    });
  }

  removeUserFromUserGroup(
    userGroupId,
    userId,
    successCallback,
    failureCallback
  ) {
    let userGroupCheck = `SELECT *  FROM UserGroup WHERE id  = ?`;
    let userCheck = `SELECT *  FROM User WHERE id  = ?`;
    let existsCheck = `SELECT *  FROM UserInGroup WHERE userGroupId  = ? AND userId  = ?`;

    // first row only
    this.db.get(userGroupCheck, [userGroupId], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite removeUserFromUserGroup  userGroup check error !!! %j",
          err
        );
        return failureCallback({ error: "userGroup" });
      }
      this.db.get(userCheck, [userId], (err, row) => {
        if (err || !row) {
          logger.error(
            "!!! sqlite removeUserFromUserGroup user check error !!! %j",
            err
          );
          return failureCallback({ error: "user" });
        }
        this.db.get(existsCheck, [userGroupId, userId], (err, row) => {
          if (err || !row) {
            logger.error(
              "!!! sqlite removeUserFromUserGroup exists check error !!! %j",
              err
            );
            return failureCallback({ error: "not exists" });
          }
          let sql = `DELETE FROM UserInGroup WHERE userGroupId  = ? AND userId  = ?`;
          this.db.run(sql, [userGroupId, userId], (err) => {
            if (err) {
              logger.error(
                "!!! sqlite removeUserFromUserGroup error !!! %j",
                err
              );
              return failureCallback({ error: "error" });
            }
            return successCallback();
          });
        });
      });
    });
  }

  createFunction(func, successCallback, failureCallback) {
    let sqlExist = `SELECT * FROM Functions WHERE name=? AND surveyId=?`;
    // first row only
    this.db.get(sqlExist, [func.name, func.surveyId], (err, row) => {
      if (err) {
        logger.error("!!! sqlite createFunction error !!! %j", err);
        return failureCallback(err);
      }
      let sql = "";
      let type = "create";
      if (row) {
        sql = `UPDATE Functions SET body = ? WHERE name=? AND surveyId=?`;
        type = "update";
      } else {
        sql = `INSERT INTO Functions(body, name, surveyId) VALUES(?, ?, ?)`;
      }
      this.db.run(sql, [func.body, func.name, func.surveyId], (err) => {
        if (err) {
          logger.error("!!! sqlite createFunction error !!! %j", err);
          return failureCallback(err, type);
        }
        return successCallback(type);
      });
    });
  }

  deleteSurvey(surveyId, successCallback, failureCallback) {
    let sql = `DELETE FROM Executions WHERE surveyId=?`;
    let sql1 = `DELETE FROM Functions WHERE surveyId=?`;
    let sql2 = `DELETE FROM Surveys WHERE id=?`;

    this.db.run(sql, [surveyId], (err) => {
      if (err) {
        logger.error("!!! sqlite deleteSurvey executions error !!! %j", err);
        return failureCallback(err);
      }
      this.db.run(sql1, [surveyId], (err) => {
        if (err) {
          logger.error("!!! sqlite deleteSurvey functions error !!! %j", err);
          return failureCallback(err);
        }
        this.db.run(sql2, [surveyId], (err) => {
          if (err) {
            logger.error("!!! sqlite deleteSurvey error !!! %j", err);
            return failureCallback(err);
          }
          return successCallback();
        });
      });
    });
  }

  deleteExecution(executionId, successCallback, failureCallback) {
    let sql = `DELETE FROM Executions WHERE id=?`;

    this.db.run(sql, [executionId], (err) => {
      if (err) {
        logger.error("!!! sqlite deleteExecution error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  deleteFunction(surveyId, functionName, successCallback, failureCallback) {
    let sql = `DELETE FROM Functions WHERE surveyId=? AND name=?`;

    this.db.run(sql, [surveyId, functionName], (err) => {
      if (err) {
        logger.error("!!! sqlite deleteFunction error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  changeSurveyStatus(
    surveyId,
    publishStatus,
    successCallback,
    failureCallback
  ) {
    let sql = `UPDATE Surveys SET published=? WHERE id=?`;

    this.db.run(sql, [publishStatus, surveyId], (err) => {
      if (err) {
        logger.error("!!! sqlite changeSurveyStatus error !!! %j", err);
        return failureCallback(err);
      }
      return successCallback();
    });
  }

  changeSurveyStatusForUserGroup(
    groupId,
    surveyId,
    publishStatus,
    successCallback,
    failureCallback
  ) {
    let sqlExist = `SELECT * FROM UserGroupSurveyAccess WHERE userGroupId=? AND surveyId=?`;
    // first row only
    this.db.get(sqlExist, [groupId, surveyId], (err, row) => {
      if (err || !row) {
        logger.error(
          "!!! sqlite changeSurveyStatusForUserGroup exists error !!! %j",
          err
        );
        return failureCallback({ error: "not exists" });
      }
      let sql = `UPDATE UserGroupSurveyAccess SET published = ? WHERE userGroupId=? AND surveyId=?`;

      this.db.run(sql, [publishStatus, groupId, surveyId], (err) => {
        if (err) {
          logger.error(
            "!!! sqlite changeSurveyStatusForUserGroup error !!! %j",
            err
          );
          return failureCallback({ error: "update failed" });
        }
        return successCallback();
      });
    });
  }
}

module.exports = DatabaseHandler;

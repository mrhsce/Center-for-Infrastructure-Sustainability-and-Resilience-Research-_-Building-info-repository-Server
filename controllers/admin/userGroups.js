const express = require("express"),
  router = express.Router();
const logger = require("../../utils/winstonLogger");
const config = require("config");

//______________________UserGroup Create or Update_____________________//
router.post("/", function (req, res) {
  logger.info("API: userGroups/Create %j", {
    params: req.body,
    userId: req.userId,
  });

  db.addOrUpdateUserGroup(
    req.body,
    (insertedId) => {
      db.addUserToUserGroup(
        insertedId,
        req.body.adminId,
        () => {},
        () => {}
      );
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({
          message: req.body.id
            ? "تیم با موفقیت به روز شد"
            : "تیم با موفقیت ایجاد شد",
        });
    },
    (error) => {
      let type = "Failure";
      let message = "خطا";
      switch (error.error) {
        case "user":
          type = "Invalid User";
          message = "کاربر مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "update failed":
          type = "update failed";
          message = "خطا در به روزرسانی تیم";
          break;
        case "insertion failed":
          type = "insertion failed";
          message = "خطا در ایجاد تیم";
          break;
        case "insertion failed":
          type = "admin insertion failed";
          message = "خطا در ایجاد تیم";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________ UserGroup select all _____________________//
router.get("/", function (req, res) {
  logger.info("API: getAllUserGroupsForGroupHead/Select ALL %j", {
    params: req.params,
    userId: req.userId,
  });

  let rows = db.getAllUserGroups();

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(rows);
});

//______________________ UserGroup select one _____________________//
router.get("/:id", function (req, res) {
  logger.info("API: UserGroups/select one %j", {
    params: req.params,
    userId: req.userId,
  });

  let group = db.getUserGroup(req.params.id);

  res
    .set({
      errCode: 0,
      errMessage: "Success",
    })
    .type("application/json")
    .status(200)
    .send(group);
});

//______________________ UserGroup delete _____________________//
router.delete("/:id", function (req, res) {
  logger.info("API: UserGroups/delete %j", {
    params: req.params,
    userId: req.userId,
  });

  db.deleteUserGroup(
    req.params.id,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "تیم با موفقیت حذف شد" });
    },
    () => {
      res
        .set({
          errCode: -3,
          errMessage: "Deletion Failed",
        })
        .status(400)
        .send({ message: "خطا در حذف تیم" });
    }
  );
});

//______________________ ADD USER TO USERGROUP_____________________//
router.put("/:userGroupId/addUser/:userId", function (req, res) {
  logger.info("API: UserGroups/AddUser %j", {
    params: req.body,
    userId: req.userId,
  });

  db.addUserToUserGroup(
    req.params.userGroupId,
    req.params.userId,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "کاربر با موفقیت به تیم افزوده شد" });
    },
    (error) => {
      let type = "Insertion Failed";
      let message = "خطا در افوزدن کاربر به تیم";
      switch (error.error) {
        case "user":
          type = "Invalid User";
          message = "کاربر مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "already exists":
          type = "Already exists";
          message = "کاربر مورد نظر در تیم است";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________ ADD SURVEY ACCESS TO USERGROUP_____________________//
router.put("/:userGroupId/addSurvey/:surveyId", function (req, res) {
  logger.info("API: UserGroups/AddSurvey %j", {
    params: req.body,
    userId: req.userId,
  });

  db.addSurveyToUserGroup(
    req.params.userGroupId,
    req.params.surveyId,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "دسترسی پرسشنامه با موفقیت به تیم داده شد" });
    },
    (error) => {
      let type = "Insertion Failed";
      let message = "خطا در افزودن دسترسی پرسش‌نامه به تیم";
      switch (error.error) {
        case "survey":
          type = "Invalid User";
          message = "پرسش‌نامه مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "already exists":
          type = "Already exists";
          message = "دسترسی پرسش‌نامه مورد نظر به تیم داده شده است";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________ ADD SURVEY ACCESS TO USERGROUP_____________________//
router.put("/:userGroupId/addSurvey/:surveyId", function (req, res) {
  logger.info("API: UserGroups/AddSurvey %j", {
    params: req.body,
    userId: req.userId,
  });

  db.addSurveyToUserGroup(
    req.params.userGroupId,
    req.params.surveyId,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "دسترسی پرسشنامه با موفقیت به تیم داده شد" });
    },
    (error) => {
      let type = "Insertion Failed";
      let message = "خطا در افزودن دسترسی پرسش‌نامه به تیم";
      switch (error.error) {
        case "survey":
          type = "Invalid User";
          message = "پرسش‌نامه مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "already exists":
          type = "Already exists";
          message = "دسترسی پرسش‌نامه مورد نظر به تیم داده شده است";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________ REMOVE SURVEY ACCESS FROM USERGROUP_____________________//
router.delete("/:userGroupId/removeSurvey/:surveyId", function (req, res) {
  logger.info("API: UserGroups/RemoveSurveyAccess %j", {
    params: req.body,
    userId: req.userId,
  });

  db.removeSurveyFromUserGroup(
    req.params.userGroupId,
    req.params.surveyId,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "دسترسی پرسش‌نامه با موفقیت از تیم حذف شد" });
    },
    (error) => {
      let type = "Deletion Failed";
      let message = "خطا در حذف دسترسی پرسش‌نامه از تیم";
      switch (error.error) {
        case "survey":
          type = "Invalid User";
          message = "پرسش‌نامه مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "not exists":
          type = "Not exists";
          message = "تیم مورد نظر دارای دسترسی پرسش‌نامه نیست";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

//______________________ REMOVE USER FROM USERGROUP_____________________//
router.delete("/:userGroupId/removeUser/:userId", function (req, res) {
  logger.info("API: UserGroups/RemoveUser %j", {
    params: req.body,
    userId: req.userId,
  });

  db.removeUserFromUserGroup(
    req.params.userGroupId,
    req.params.userId,
    () => {
      res
        .set({
          errCode: 0,
          errMessage: "Success",
        })
        .type("application/json")
        .status(200)
        .send({ message: "کاربر با موفقیت از تیم حذف شد" });
    },
    (error) => {
      let type = "Deletion Failed";
      let message = "خطا در حذف کاربر از تیم";
      switch (error.error) {
        case "user":
          type = "Invalid User";
          message = "کاربر مورد نظر وجود ندارد";
          break;
        case "userGroup":
          type = "Invalid UserGroup";
          message = "تیم مورد نظر وجود ندارد";
          break;
        case "not exists":
          type = "Not exists";
          message = "کاربر مورد نظر در تیم نیست";
          break;
      }
      res
        .set({
          errCode: -2,
          errMessage: type,
        })
        .status(400)
        .send({ message: message });
    }
  );
});

module.exports = router;

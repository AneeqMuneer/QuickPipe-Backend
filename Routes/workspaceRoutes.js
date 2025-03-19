const express = require("express");
const { CreateWorkspace , UpdateWorkspace , GetAllUserWorkspace , GetCurrentWorkspace , SwitchWorkspace } = require("../Controller/workspaceController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/CreateWorkspace").post(VerifyUser, CreateWorkspace);
router.route("/UpdateWorkspace").put(VerifyUser, UpdateWorkspace);
router.route("/GetAllUserWorkspace").get(VerifyUser, GetAllUserWorkspace);
router.route("/GetCurrentWorkspace").get(VerifyUser, GetCurrentWorkspace);
router.route("/SwitchWorkspace").put(VerifyUser, SwitchWorkspace);

module.exports = router;
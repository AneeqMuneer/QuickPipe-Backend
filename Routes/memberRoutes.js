const express = require("express");
const { AddMember , GetWorkspaceMembers , AcceptInvitation } = require("../Controller/memberController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/AddMember").post(VerifyUser, AddMember);
router.route("/GetWorkspaceMembers").get(VerifyUser , GetWorkspaceMembers);
router.route("/AcceptInvitation").put(AcceptInvitation);

module.exports = router;
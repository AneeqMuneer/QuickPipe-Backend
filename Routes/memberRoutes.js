const express = require("express");
const { AddMember , GetWorkspaceMembers , VerifyInvitation , AcceptInvitation , RejectInvitation } = require("../Controller/memberController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/AddMember").post(VerifyUser, AddMember);
router.route("/GetWorkspaceMembers").get(VerifyUser , GetWorkspaceMembers);
router.route("/VerifyInvitation/:wkid/:usid").get(VerifyInvitation);
router.route("/AcceptInvitation").put(AcceptInvitation);
router.route("/RejectInvitation").put(RejectInvitation);

module.exports = router;
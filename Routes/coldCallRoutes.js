const express = require("express");
const { CreateHumanCall, CreateAICall, TwimlStatus, SwitchToAIMode, HandleAICall, ProcessUserInput } = require("../Controller/coldCallController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/HumanCall").post(VerifyUser, CreateHumanCall);
router.route("/status").post(TwimlStatus);
router.route("/AICall").post(VerifyUser , CreateAICall);

// APIs not to be integrated
router.route("/handle-ai-call").post(HandleAICall);
router.route("/process-user-input").post(ProcessUserInput);

module.exports = router;
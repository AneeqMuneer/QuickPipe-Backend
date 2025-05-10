const express = require("express");
const { CreateHumanCall , Voicebot , TwimlStatus } = require("../Controller/coldCallController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/Voicebot").post(Voicebot);
router.route("/HumanCall").post(VerifyUser, CreateHumanCall);
router.route("/status").post(TwimlStatus);

module.exports = router;
const express = require("express");
const { CreateHumanCall, CreateAICall, TwimlStatus, SwitchToAIMode, HandleAICall, ProcessUserInput,CreateCloneVoice,TextToSpeech } = require("../Controller/coldCallController");
const { VerifyUser } = require("../Middleware/userAuth");
const {upload} = require("../Middleware/multer");
const router = express.Router();

router.route("/HumanCall").post(VerifyUser, CreateHumanCall);
router.route("/status").post(TwimlStatus);
router.route("/AICall").post(VerifyUser , CreateAICall);
router.route("/CloneVoice").post(VerifyUser,upload.single('files'), CreateCloneVoice);
router.route("/TextToSpeech").post(VerifyUser, TextToSpeech);

// APIs not to be integrated
router.route("/handle-ai-call").post(HandleAICall);
router.route("/process-user-input").post(ProcessUserInput);

module.exports = router;
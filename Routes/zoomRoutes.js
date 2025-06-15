const express = require("express");
const { ZoomAuth, ZoomCallback, CreateZoomMeeting } = require("../Controller/zoomController");

const router = express.Router();

router.get("/auth", ZoomAuth);
router.get("/callback", ZoomCallback);
router.post("/create-meeting", CreateZoomMeeting);

module.exports = router;

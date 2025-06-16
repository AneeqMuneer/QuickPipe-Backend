const express = require("express");
const { getAllMeetings } = require("../Controller/meetingController");
const router = express.Router();

router.get("/", getAllMeetings);

module.exports = router; 
const express = require("express");
const { LiveFeed, StatsWidget, TopPeople } = require("../Controller/dashboardController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/LiveFeed").post(LiveFeed);
router.route("/StatsWidget").get(VerifyUser, StatsWidget);
router.route("/TopPeople").get(VerifyUser, TopPeople);

module.exports = router;
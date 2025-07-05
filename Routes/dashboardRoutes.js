const express = require("express");
const { SummaryWidget, LiveFeed, StatsWidget, TopPeopleWidget } = require("../Controller/dashboardController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/SummaryWidget").get(VerifyUser, SummaryWidget);
router.route("/LiveFeed").post(LiveFeed);
router.route("/StatsWidget").get(VerifyUser, StatsWidget);
router.route("/TopPeopleWidget").get(VerifyUser, TopPeopleWidget);

module.exports = router;
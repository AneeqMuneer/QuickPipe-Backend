const express = require("express");
const { SummaryWidget, StatsWeeklyWidget, LiveFeedWidget, StatsMonthlyWidget, TopPeopleWidget } = require("../Controller/dashboardController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/SummaryWidget").get(VerifyUser, SummaryWidget);
router.route("/LiveFeedWidget").post(LiveFeedWidget);
router.route("/StatsWeeklyWidget").get(VerifyUser, StatsWeeklyWidget);
router.route("/StatsMonthlyWidget").get(VerifyUser, StatsMonthlyWidget);
router.route("/TopPeopleWidget").get(VerifyUser, TopPeopleWidget);

module.exports = router;
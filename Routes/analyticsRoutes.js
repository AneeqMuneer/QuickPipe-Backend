const express = require("express");
const { GetWorkspaceAnalyticsMonthly , GetWorkspaceAnalyticsQuarterly , GetWorkspaceAnalyticsYearly } = require("../Controller/analyticsController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/GetWorkspaceAnalyticsMonthly").get(VerifyUser, GetWorkspaceAnalyticsMonthly);
router.route("/GetWorkspaceAnalyticsQuarterly").get(VerifyUser, GetWorkspaceAnalyticsQuarterly);
router.route("/GetWorkspaceAnalyticsYearly").get(VerifyUser, GetWorkspaceAnalyticsYearly);

module.exports = router;
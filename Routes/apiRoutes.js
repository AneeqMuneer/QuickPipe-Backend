const express = require("express");
const { AddApi , CalendarAuthCheck } = require("../Controller/apiController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/AddApi").post(VerifyUser, AddApi);
router.route("/CalendarAuthCheck").get(VerifyUser, CalendarAuthCheck);

module.exports = router;
const express = require("express");
const { AddApi } = require("../Controller/apiController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/AddApi").post(VerifyUser, AddApi);

module.exports = router;

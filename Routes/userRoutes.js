const express = require("express");
const { UserLogin , UserSignUp } = require("../Controller/ambassadorController");
const { VerifyUser } = require("../Middleware/userAuth");
// const upload = require("../Middleware/multer.js");

const router = express.Router();

router.route("/signup").post(UserSignUp);
router.route("/login").post(UserLogin);

module.exports = router;
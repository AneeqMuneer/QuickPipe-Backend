const express = require("express");
const { Login, Signup, TwoFactorAuthentication, VerifyCode, ForgetPassword, VerifyOldPassword, UpdatePassword, ResetPassword, GetUserDetails, UpdateUserDetails } = require("../Controller/userController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/Signup").post(Signup);
router.route("/Login").post(Login, TwoFactorAuthentication);
router.route("/ForgetPassword").put(VerifyUser, ForgetPassword);

router.route("/VerifyCode").post(VerifyCode);
router.route("/2FA").get(VerifyUser, TwoFactorAuthentication);
router.route("/ResetPassword").put(ResetPassword);

router.route("/GetUserDetails").get(VerifyUser, GetUserDetails);
router.route("/UpdateUserDetails").put(VerifyUser, UpdateUserDetails);
router.route("/UpdatePassword").put(VerifyUser, VerifyOldPassword, UpdatePassword);

module.exports = router;
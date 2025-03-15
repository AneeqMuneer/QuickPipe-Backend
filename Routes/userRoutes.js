const express = require("express");
const { Login , Signup , TwoFactorAuthentication , VerifyCode , ForgetPassword , VerifyOldPassword , UpdatePassword , ResetPassword } = require("../Controller/userController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/Signup").post(Signup);
router.route("/Login").post(Login , TwoFactorAuthentication);
router.route("/VerifyCode").post(VerifyCode);
router.route("/2FA").get(VerifyUser , TwoFactorAuthentication);
router.route("/ForgetPassword").post(VerifyUser , ForgetPassword);
router.route("/ResetPassword").post(ResetPassword);
router.route("/UpdatePassword").post(VerifyUser , VerifyOldPassword , UpdatePassword);

module.exports = router;
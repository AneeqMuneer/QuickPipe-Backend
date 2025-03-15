const express = require("express");
const { Login , Signup , TwoFactorAuthentication , VerifyCode , ForgetPassword , VerifyOldPassword , UpdatePassword , ResetPassword , GetUserDetails , UpdateUserDetails } = require("../Controller/userController");
const { VerifyUser } = require("../Middleware/userAuth");
const { Verify } = require("crypto");

const router = express.Router();

router.route("/Signup").post(Signup);
router.route("/Login").post(Login , TwoFactorAuthentication);
router.route("/ForgetPassword").post(VerifyUser , ForgetPassword);

router.route("/VerifyCode").post(VerifyCode);
router.route("/2FA").get(VerifyUser , TwoFactorAuthentication);
router.route("/ResetPassword").post(ResetPassword);

router.route("/GetUserDetails").get(VerifyUser , GetUserDetails);
router.route("/UpdateUserDetails").post(VerifyUser , UpdateUserDetails);
router.route("/UpdatePassword").post(VerifyUser , VerifyOldPassword , UpdatePassword);

module.exports = router;
const express = require("express");
const { 
    GetAllEmailAccounts , ReadyGmailAccount , GmailAccountCallback , 
    ReadyMicrosoftAccount , MicrosoftAccountCallback , GetDomainSuggestions , 
    GetDomainPrices , GetTlds , CreatePaymentIntent , StripeWebhook } = require("../Controller/emailAccountController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/GetAllEmailAccounts").get(VerifyUser, GetAllEmailAccounts);

router.route("/GetTlds").get(VerifyUser, GetTlds);
router.route("/GetDomainSuggestions").post(VerifyUser, GetDomainSuggestions);
router.route("/GetDomainPrices").post(VerifyUser, GetDomainPrices);
router.route("/CreatePaymentIntent").post(VerifyUser, CreatePaymentIntent);
router.route("/StripeWebhook").post(StripeWebhook);

router.route("/ReadyGmailAccount").get(VerifyUser, ReadyGmailAccount);
router.route("/google/callback").get(VerifyUser, GmailAccountCallback);

router.route("/ReadyMicrosoftAccount").get(VerifyUser, ReadyMicrosoftAccount);
router.route("/microsoft/callback").get(VerifyUser , MicrosoftAccountCallback);

module.exports = router;
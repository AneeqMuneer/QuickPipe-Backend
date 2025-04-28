const express = require("express");
const { GetAllEmailAccounts , ReadyGmailAccount , GmailAccountCallback , ReadyMicrosoftAccount , MicrosoftAccountCallback , GetDomainSuggestions , GetDomainPrices } = require("../Controller/emailAccountController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/GetAllEmailAccounts").get(VerifyUser, GetAllEmailAccounts);


router.route("/GetDomainSuggestions").get(VerifyUser, GetDomainSuggestions);
router.route("/GetDomainPrices").get(VerifyUser, GetDomainPrices);


router.route("/ReadyGmailAccount").get(VerifyUser, ReadyGmailAccount);
router.route("/google/callback").get(VerifyUser, GmailAccountCallback);

router.route("/ReadyMicrosoftAccount").get(VerifyUser, ReadyMicrosoftAccount);
router.route("/microsoft/callback").get(MicrosoftAccountCallback);

module.exports = router;
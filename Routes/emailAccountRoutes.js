const express = require("express");
const {
    GetAllEmailAccounts, ReadyGmailAccount, GmailAccountCallback,
    ReadyMicrosoftAccount, MicrosoftAccountCallback, GetDomainSuggestions,
    GetDomainPrices, GetTlds, CreatePaymentIntent, StripeWebhook, CheckPaymentIntentStatus,
    PurchaseDomains, CheckTldRegisterable, GetAccountDomains, UpdateDomainDNS, GetDomainDNSDetails,
    ZohoAccountCallback, ZohoRefreshToken, AddOrder, UpdateOrderStatus, AddDomain, GetDomains,
    CreateZohoMailbox
} = require("../Controller/emailAccountController");
const { VerifyUser } = require("../Middleware/userAuth");

const router = express.Router();

router.route("/GetAllEmailAccounts").get(VerifyUser, GetAllEmailAccounts);


/* PART 1: Ready to send Accounts */
router.route("/GetDomainSuggestions").post(VerifyUser, GetDomainSuggestions);
router.route("/GetDomainPrices").post(VerifyUser, GetDomainPrices);

router.route("/CreatePaymentIntent").post(VerifyUser, CreatePaymentIntent);
router.route("/AddOrder").post(VerifyUser, AddOrder);
router.route("/UpdateOrderStatus").put(VerifyUser, UpdateOrderStatus);
router.route("/StripeWebhook").post(StripeWebhook);
router.route("/CheckPaymentIntentStatus").post(CheckPaymentIntentStatus);

router.route("/PurchaseDomains").post(VerifyUser, PurchaseDomains);
router.route("/AddDomain").post(VerifyUser, AddDomain);
router.route("/GetDomains").get(VerifyUser, GetDomains);

router.route("/zoho/refreshtoken").get(VerifyUser, ZohoRefreshToken);
router.route("/UpdateDomainDNS").post(VerifyUser, UpdateDomainDNS);
router.route("/CreateZohoMailbox").post(VerifyUser, CreateZohoMailbox);

// APIs for testing purposes
router.route("/GetTlds").get(VerifyUser, GetTlds);
router.route("/CheckTldRegisterable").post(CheckTldRegisterable);
router.route("/GetAccountDomains").get(GetAccountDomains);
router.route("/zoho/callback").post(ZohoAccountCallback);
router.route("/GetDomainDNSDetails").post(VerifyUser, GetDomainDNSDetails);


/* PART 2: Hassle-free Email Setup | Gmail/Google Suite */
router.route("/ReadyGmailAccount").get(VerifyUser, ReadyGmailAccount);
router.route("/google/callback").get(VerifyUser, GmailAccountCallback);


/* PART 3: Ready to send Accounts | Microsoft Office 365 Suite*/
router.route("/ReadyMicrosoftAccount").get(VerifyUser, ReadyMicrosoftAccount);
router.route("/microsoft/callback").get(VerifyUser, MicrosoftAccountCallback);

module.exports = router;
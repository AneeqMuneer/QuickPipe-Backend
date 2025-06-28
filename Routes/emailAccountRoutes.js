const express = require("express");
const {
    GetAllEmailAccounts,
    GetDomainSuggestions, GetDomainPrices, CreatePaymentIntent, StripeWebhook, CheckPaymentIntentStatus,
    PurchaseDomains, GetAccountDomains, 
    ConfigureEmailHosting, VerifyEmailHosting, GetDomainStatus, ConfigureWebForwarding, CreateZohoMailbox, GetMailHostingDomains,
    GetDomainDNSDetails, ZohoAccountCallback, ZohoRefreshToken, 
    AddOrder, UpdateOrderStatus, AddDomain, GetDomains,
    GetTlds, CheckTldRegisterable,
    ReadyGmailAccount, GmailAccountCallback, ReadyMicrosoftAccount, MicrosoftAccountCallback,
    Sendgrid, Sendgrid1, Sendgrid2, SendgridWebhook
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
router.route("/ConfigureWebForwarding").post(VerifyUser, ConfigureWebForwarding);
router.route("/ConfigureEmailHosting").post(VerifyUser, ConfigureEmailHosting);
router.route("/GetDomainStatus").post(VerifyUser, GetDomainStatus);
router.route("/VerifyEmailHosting").post(VerifyUser, VerifyEmailHosting);
router.route("/CreateZohoMailbox").post(VerifyUser, CreateZohoMailbox);
router.route("/GetMailHostingDomains").get(VerifyUser, GetMailHostingDomains);

// APIs for testing purposes
router.route("/GetTlds").get(GetTlds);
router.route("/CheckTldRegisterable").post(CheckTldRegisterable);
router.route("/GetAccountDomains").get(GetAccountDomains);
router.route("/zoho/callback").post(ZohoAccountCallback);
router.route("/GetDomainDNSDetails").post(GetDomainDNSDetails);
router.route("/Sendgrid").post(Sendgrid);
router.route("/Sendgrid1").post(VerifyUser, Sendgrid1);
router.route("/Sendgrid2").post(Sendgrid2);
router.route("/SendgridWebhook").post(SendgridWebhook);

/* PART 2: Hassle-free Email Setup | Gmail/Google Suite */
router.route("/ReadyGmailAccount").get(VerifyUser, ReadyGmailAccount);
router.route("/google/callback").get(VerifyUser, GmailAccountCallback);


/* PART 3: Ready to send Accounts | Microsoft Office 365 Suite*/
router.route("/ReadyMicrosoftAccount").get(VerifyUser, ReadyMicrosoftAccount);
router.route("/microsoft/callback").get(VerifyUser, MicrosoftAccountCallback);

module.exports = router;
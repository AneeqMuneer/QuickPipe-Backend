const express = require("express");
const {
    GetAllEmailAccounts, ReadyGmailAccount, GmailAccountCallback,
    ReadyMicrosoftAccount, MicrosoftAccountCallback, GetDomainSuggestions,
    GetDomainPrices, GetTlds, CreatePaymentIntent, StripeWebhook, CheckPaymentIntentStatus,
    PurchaseDomains, CheckTldRegisterable, GetAccountDomains, ConfigureDomainEmailHosting, GetDomainDNSDetails,
    ZohoAccountCallback, ZohoRefreshToken, AddOrder, UpdateOrderStatus, AddDomain, GetDomains,
    CreateZohoMailbox, VerifyDomainEmailHosting, SwitchEmail2Forwarding, SwitchForwarding2Email, 
    ConfigureDomainForwarding
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
router.route("/ConfigureDomainForwarding").post(VerifyUser, ConfigureDomainForwarding);
router.route("/SwitchForwarding2Email").post(VerifyUser, SwitchForwarding2Email);
router.route("/ConfigureDomainEmailHosting").post(VerifyUser, ConfigureDomainEmailHosting);
router.route("/VerifyDomainEmailHosting").post(VerifyUser, VerifyDomainEmailHosting);
router.route("/SwitchEmail2Forwarding").post(VerifyUser, SwitchEmail2Forwarding);
router.route("/CreateZohoMailbox").post(VerifyUser, CreateZohoMailbox);

// APIs for testing purposes
router.route("/GetTlds").get(GetTlds);
router.route("/CheckTldRegisterable").post(CheckTldRegisterable);
router.route("/GetAccountDomains").get(GetAccountDomains);
router.route("/zoho/callback").post(ZohoAccountCallback);
router.route("/GetDomainDNSDetails").post(GetDomainDNSDetails);

/* PART 2: Hassle-free Email Setup | Gmail/Google Suite */
router.route("/ReadyGmailAccount").get(VerifyUser, ReadyGmailAccount);
router.route("/google/callback").get(VerifyUser, GmailAccountCallback);


/* PART 3: Ready to send Accounts | Microsoft Office 365 Suite*/
router.route("/ReadyMicrosoftAccount").get(VerifyUser, ReadyMicrosoftAccount);
router.route("/microsoft/callback").get(VerifyUser, MicrosoftAccountCallback);

module.exports = router;
const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require('googleapis');
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const xml2js = require("xml2js");
const { setAccessToken, getAccessToken } = require('../Utils/redisUtils');
const { Op } = require('sequelize');
const SgMail = require('@sendgrid/mail');

SgMail.setApiKey(process.env.SENDGRID_API_KEY);

const EmailAccountModel = require("../Model/emailAccountModel");
const OrderModel = require("../Model/orderModel");
const DomainModel = require("../Model/domainModel");

const { GmailOauth2Client, GmailScopes, MicrosoftEmailAccountDetails, GenerateRandomPassword, SendZohoAccountCreationEmail } = require("../Utils/emailAccountsUtils");
const { ClientId, ClientSecret, RedirectUri, OutlookScopes } = MicrosoftEmailAccountDetails;

/* Home Page */

exports.GetAllEmailAccounts = catchAsyncError(async (req, res, next) => {

    const emailAccounts = await EmailAccountModel.findAll({
        where: {
            WorkspaceId: req.user.User.CurrentWorkspaceId
        }
    });

    res.status(200).json({
        success: true,
        emailAccounts
    });
});

/* PART 1: Ready to send Accounts */

exports.GetTlds = catchAsyncError(async (req, res, next) => {
    const response = await axios.get(`${process.env.GODADDY_API_URL}/v1/domains/tlds`, {
        headers: {
            Authorization: `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`
        }
    });

    const tlds = response.data.filter(tld => tld.type === "GENERIC").map(tld => tld.name).splice(0, 50);

    res.status(200).json({
        success: true,
        message: "TLDs retrieved successfully",
        tlds
    });
});

exports.GetDomainSuggestions = catchAsyncError(async (req, res, next) => {
    const { domain, tlds, limit } = req.body;

    if (!domain || tlds.length === 0) {
        return next(new ErrorHandler("Domain and TLDs are required", 400));
    }

    const tldsList = tlds.map(tld => tld.replace(/\./g, '')).join(',');

    const url = `${process.env.GODADDY_API_URL}/v1/domains/suggest?query=${domain}&tlds=${tldsList}&limit=${limit || 10}&available=true`;

    const response = await axios.get(url, {
        headers: {
            Authorization: `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
            'Content-Type': 'application/json',
        },
    });

    const suggestions = response.data;
    const domains = suggestions.map(suggestion => suggestion.domain);

    res.status(200).json({
        success: true,
        message: suggestions.length === 0 ? "No domain suggestions found" : "Domain suggestions retrieved successfully",
        Suggestions: domains
    });
});

exports.GetDomainPrices = catchAsyncError(async (req, res, next) => {
    const { Domains } = req.body;

    const results = { Available: { PremiumDomains: [], NonPremiumDomains: [] }, Unavailable: { PremiumDomains: [], NonPremiumDomains: [] }, Unregistrable: [] };
    const CheckDomains = [];
    let totalPrice = 0;

    if (Domains.length === 0) {
        return next(new ErrorHandler("Please provide at least one domain", 400));
    }

    const tlds = Domains.map(d => d.substring(d.indexOf('.') + 1));

    const tldRegistrableUrl = `${process.env.BACKEND_URL}/EmailAccount/CheckTldRegisterable`;

    let tldRegistrable;
    try {
        const tldRegistrableResponse = await axios.post(tldRegistrableUrl, { Tlds: tlds });
        tldRegistrable = tldRegistrableResponse.data.Tlds;
    } catch (error) {
        return next(new ErrorHandler(error.response.data.message, 400));
    }

    for (let i = 0; i < Domains.length; i++) {
        if (!tldRegistrable[i]) {
            results.Unregistrable.push(Domains[i]);
            continue;
        } else {
            CheckDomains.push(Domains[i]);
        }
    }

    console.log("Unregistrable domains skipped");

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const domainList = CheckDomains.map(d => d.trim().toLowerCase()).join(',');

    const checkUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.check&DomainList=${domainList}`;
    console.log("hello");
    let checkResponseJson;
    try {
        const checkResponseXml = await axios.get(checkUrl);
        checkResponseJson = await xml2js.parseStringPromise(checkResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (checkResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(checkResponseJson.ApiResponse.Errors.Error._, 400));
        }
    } catch (error) {
        console.log(error.response.data);
        return next(new ErrorHandler(error.response.data.data.errorCode, 400));
    }

    const entries = Array.isArray(checkResponseJson.ApiResponse.CommandResponse.DomainCheckResult)
        ? checkResponseJson.ApiResponse.CommandResponse.DomainCheckResult
        : [checkResponseJson.ApiResponse.CommandResponse.DomainCheckResult];

    const nonPremiumEntries = [];

    for (const entry of entries) {
        if (entry.$.Available === 'true') {
            if (entry.$.IsPremiumName === 'true') {
                results.Available.PremiumDomains.push({
                    domain: entry.$.Domain,
                    price: parseFloat(parseFloat(entry.$.PremiumRegistrationPrice).toFixed(2)),
                    renewalPrice: parseFloat(parseFloat(entry.$.PremiumRenewalPrice).toFixed(2)),
                    transferPrice: parseFloat(parseFloat(entry.$.PremiumTransferPrice).toFixed(2)),
                    eapFee: parseFloat(parseFloat(entry.$.EapFee).toFixed(2))
                });

                totalPrice += parseFloat(entry.$.PremiumRegistrationPrice) + parseFloat(entry.$.EapFee);
            } else {
                nonPremiumEntries.push(entry.$.Domain);
            }
        } else {
            if (entry.$.IsPremiumName === 'true') {
                results.Unavailable.PremiumDomains.push(entry.$.Domain);
            } else {
                results.Unavailable.NonPremiumDomains.push(entry.$.Domain);
            }
        }
    }

    console.log("Premium domain info fetched");

    const pricingBaseUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.users.getPricing&ProductType=DOMAIN`;

    for (const domain of nonPremiumEntries) {
        const tld = domain.substring(domain.indexOf('.') + 1);
        const pricingUrl = pricingBaseUrl + `&ProductName=${tld}`;

        const pricingResponseXml = await axios.get(pricingUrl);
        const pricingResponseJson = await xml2js.parseStringPromise(pricingResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (pricingResponseJson.ApiResponse.$.Status === 'ERROR') {
            throw new Error(pricingResponseJson.ApiResponse.Errors.Error._);
        }

        const pricingInfo = pricingResponseJson.ApiResponse.CommandResponse.UserGetPricingResult.ProductType.ProductCategory;

        const pricingCategories = Array.isArray(pricingInfo) ? pricingInfo : [pricingInfo];

        const registerCategory = pricingCategories.find(cat => cat['$'] && cat['$'].Name === 'register');
        const renewCategory = pricingCategories.find(cat => cat['$'] && cat['$'].Name === 'renew');
        const transferCategory = pricingCategories.find(cat => cat['$'] && cat['$'].Name === 'transfer');

        if (!registerCategory) {
            return next(new ErrorHandler("Register category not found in pricing info", 400));
        }

        if (!renewCategory) {
            return next(new ErrorHandler("Renew category not found in pricing info", 400));
        }

        if (!transferCategory) {
            return next(new ErrorHandler("Transfer category not found in pricing info", 400));
        }

        const registerPrice = parseFloat((parseFloat(registerCategory.Product.Price[0].$.RegularPrice) +
            (registerCategory.Product.Price[0].$.RegularAdditionalCost ? parseFloat(registerCategory.Product.Price[0].$.RegularAdditionalCost) : 0)).toFixed(2));

        const renewPrice = parseFloat((parseFloat(renewCategory.Product.Price[0].$.RegularPrice) +
            (renewCategory.Product.Price[0].$.RegularAdditionalCost ? parseFloat(renewCategory.Product.Price[0].$.RegularAdditionalCost) : 0)).toFixed(2));

        const transferPrice = parseFloat((parseFloat(transferCategory.Product.Price.$.RegularPrice) +
            (transferCategory.Product.Price.$.RegularAdditionalCost ? parseFloat(transferCategory.Product.Price.$.RegularAdditionalCost) : 0)).toFixed(2));

        results.Available.NonPremiumDomains.push({
            domain,
            registerPrice,
            renewPrice,
            transferPrice
        });

        totalPrice += registerPrice;
    }

    console.log("Non premium domain info fetched");

    res.status(200).json({
        success: true,
        message: "Domain availability and pricing retrieved",
        prices: results,
        totalPrice
    });
});

exports.CreatePaymentIntent = catchAsyncError(async (req, res, next) => {
    const { Amount, Domains } = req.body;

    if (!Amount || typeof Amount !== 'number' || isNaN(Amount)) {
        return next(new ErrorHandler("Invalid amount provided", 400));
    }

    if (!Array.isArray(Domains) || Domains.length === 0) {
        return next(new ErrorHandler("No domains provided", 400));
    }

    const intent = await stripe.paymentIntents.create({
        amount: Amount * 100,
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
            Domains: JSON.stringify(Domains),
            TotalRequested: Amount,
            UserId: req.user?.User?.id || 'guest',
            WorkspaceId: req.user?.User?.CurrentWorkspaceId || 'guest-workspace'
        }
    });

    res.status(200).json({
        success: true,
        message: "Payment intent created successfully",
        clientSecret: intent.client_secret,
        intentId: intent.id
    });
});

exports.AddOrder = catchAsyncError(async (req, res, next) => {
    const { Domains, TotalAmount, PaymentIntentId } = req.body;
    const BuyerId = req.user?.User?.id;
    const WorkspaceId = req.user?.User?.CurrentWorkspaceId;

    if (!BuyerId || !WorkspaceId || !Domains || !TotalAmount || !PaymentIntentId) {
        return next(new ErrorHandler("All required fields are not provided", 400));
    }

    for (const domain of Domains) {
        if (!domain.Name || !domain.Price || !domain.Type) {
            return next(new ErrorHandler("All required fields are not provided", 400));
        }

        if (domain.Type === "Premium") {
            if (!domain.EapFee || domain.EapFee < 0 || typeof domain.EapFee !== 'number' || isNaN(domain.EapFee)) {
                return next(new ErrorHandler("EapFee is required for premium domains", 400));
            }
        }

        if (domain.Price < 0 || typeof domain.Price !== 'number' || isNaN(domain.Price)) {
            return next(new ErrorHandler("Invalid price provided", 400));
        }

        if (domain.Duration) {
            if (domain.Duration < 0 || typeof domain.Duration !== 'number' || isNaN(domain.Duration)) {
                return next(new ErrorHandler("Invalid duration provided", 400));
            }
        } else {
            domain.Duration = 1;
        }

        const Domain = await DomainModel.findOne({
            where: {
                DomainName: domain.Name,
            }
        });

        if (Domain) {
            return next(new ErrorHandler(`Domain ${domain.Name} has already been purchased and is not available for purchase again.`, 400));
        }
    }

    if (TotalAmount < 0 || typeof TotalAmount !== 'number' || isNaN(TotalAmount)) {
        return next(new ErrorHandler("Invalid price provided", 400));
    }

    const totalPrice = Domains.reduce((acc, domain) => {
        const basePrice = domain.Price;
        const eapFee = domain.Type === "Premium" ? domain.EapFee : 0;
        return acc + basePrice + eapFee;
    }, 0);

    if (TotalAmount !== totalPrice) {
        return next(new ErrorHandler("Invalid total amount provided", 400));
    }

    const Order = await OrderModel.create({
        BuyerId,
        WorkspaceId,
        Domains,
        TotalAmount,
        StripePaymentIntentId: PaymentIntentId
    });

    res.status(200).json({
        success: true,
        message: "Order created successfully",
        Order
    });
});

exports.UpdateOrderStatus = catchAsyncError(async (req, res, next) => {
    const { OrderId, StripeStatus, PurchaseStatus } = req.body;

    if (!OrderId) {
        return next(new ErrorHandler("Order ID is required", 400));
    }

    const Order = await OrderModel.findByPk(OrderId);

    if (!Order) {
        return next(new ErrorHandler("Order not found", 400));
    }

    if (StripeStatus) {
        Order.StripePaymentStatus = StripeStatus;
    }

    if (PurchaseStatus) {
        Order.DomainPurchaseStatus = PurchaseStatus;
    }

    await Order.save();

    res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        Order
    });
});

exports.StripeWebhook = catchAsyncError(async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody || req.body,
            sig,
            endpointSecret
        );
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return next(new ErrorHandler(`Webhook signature verification failed: ${err.message}`, 400));
    }

    switch (event.type) {
        case 'payment_intent.created':
            console.log(`PaymentIntent was created!`);
            break;
        case 'payment_intent.canceled':
            console.log(`PaymentIntent was canceled!`);
            break;
        case 'payment_intent.succeeded':
            console.log(`PaymentIntent was successful!`);
            break;
        case 'payment_intent.processing':
            console.log(`PaymentIntent is processing!`);
            break;
        case 'payment_intent.payment_failed':
            console.log(`PaymentIntent failed`);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({
        success: true,
        message: "Webhook received and processed successfully"
    });
});

exports.CheckPaymentIntentStatus = catchAsyncError(async (req, res, next) => {
    const { IntentId } = req.body;

    if (!IntentId) {
        return next(new ErrorHandler("Payment intent ID is required", 400));
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(IntentId);

    if (!paymentIntent) {
        return next(new ErrorHandler("Payment intent not found", 400));
    }

    res.status(200).json({
        success: true,
        message: "Payment intent status retrieved successfully",
        status: paymentIntent.status
    });
});

exports.CheckTldRegisterable = catchAsyncError(async (req, res, next) => {
    const { Tlds } = req.body;

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const url = `${BaseUrl}/xml.response?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.gettldlist`;

    const responseXml = await axios.post(url);
    const responseJson = await xml2js.parseStringPromise(responseXml.data, { explicitArray: false, attrkey: '$' });

    if (responseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(responseJson.ApiResponse.Errors.Error._, 400));
    }

    const tlds = responseJson.ApiResponse.CommandResponse.Tlds.Tld;

    const tldMap = new Map(tlds.map(tld => [tld.$.Name, tld.$.IsApiRegisterable === 'true']));

    const registrable = Tlds.map(name => tldMap.get(name) || false);

    res.status(200).json({
        success: true,
        message: "Tld registerable status retrieved successfully",
        registrable
    });
});

exports.GetAccountDomains = catchAsyncError(async (req, res, next) => {
    const baseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const url = `${baseUrl}/xml.response?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.getlist`;

    const responseXml = await axios.post(url);
    const responseJson = await xml2js.parseStringPromise(responseXml.data, { explicitArray: false, attrkey: '$' });

    if (responseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(responseJson.ApiResponse.Errors.Error._, 400));
    }

    const DomainsDetails = responseJson.ApiResponse.CommandResponse.DomainGetListResult.Domain;

    let domains;
    if (Array.isArray(DomainsDetails)) {
        domains = DomainsDetails.map(domain => domain.$.Name);
    } else {
        domains = DomainsDetails.$.Name;
    }

    res.status(200).json({
        success: true,
        message: "Account domains retrieved successfully",
        domains,
        DomainsDetails
    });
});

exports.PurchaseDomains = catchAsyncError(async (req, res, next) => {
    const { Domains, PaymentIntentId, UserDetails } = req.body;
    console.log(Domains);

    const PaymentIntentStatusUrl = `${process.env.BACKEND_URL}/EmailAccount/CheckPaymentIntentStatus`;
    const PaymentIntentStatusResponse = await axios.post(PaymentIntentStatusUrl, { IntentId: PaymentIntentId });

    if (PaymentIntentStatusResponse.data.status !== "succeeded") {
        return next(new ErrorHandler("Payment for this purchase has not been completed yet. Please try again later.", 400));
    }

    console.log("Payment intent status checked");

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const Purchased = [];
    const Unpurchased = [];

    const DomainPurchaseUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.create`
        + `&Years=1`
        + `&RegistrantFirstName=${UserDetails.FirstName}&RegistrantLastName=${UserDetails.LastName}&RegistrantAddress1=${UserDetails.Address}&RegistrantCity=${UserDetails.City}&RegistrantStateProvince=${UserDetails.StateProvince}&RegistrantPostalCode=${UserDetails.PostalCode}&RegistrantCountry=${UserDetails.Country}&RegistrantPhone=${UserDetails.Phone}&RegistrantEmailAddress=${UserDetails.Email}`
        + `&TechFirstName=${UserDetails.FirstName}&TechLastName=${UserDetails.LastName}&TechAddress1=${UserDetails.Address}&TechCity=${UserDetails.City}&TechStateProvince=${UserDetails.StateProvince}&TechPostalCode=${UserDetails.PostalCode}&TechCountry=${UserDetails.Country}&TechPhone=${UserDetails.Phone}&TechEmailAddress=${UserDetails.Email}`
        + `&AdminFirstName=${UserDetails.FirstName}&AdminLastName=${UserDetails.LastName}&AdminAddress1=${UserDetails.Address}&AdminCity=${UserDetails.City}&AdminStateProvince=${UserDetails.StateProvince}&AdminPostalCode=${UserDetails.PostalCode}&AdminCountry=${UserDetails.Country}&AdminPhone=${UserDetails.Phone}&AdminEmailAddress=${UserDetails.Email}`
        + `&AuxBillingFirstName=${UserDetails.FirstName}&AuxBillingLastName=${UserDetails.LastName}&AuxBillingAddress1=${UserDetails.Address}&AuxBillingCity=${UserDetails.City}&AuxBillingStateProvince=${UserDetails.StateProvince}&AuxBillingPostalCode=${UserDetails.PostalCode}&AuxBillingCountry=${UserDetails.Country}&AuxBillingPhone=${UserDetails.Phone}&AuxBillingEmailAddress=${UserDetails.Email}`
        + `&AddFreeWhoisguard=yes&WGEnabled=yes`;

    for (const domain of Domains.NonPremiumDomains) {
        const tld = domain.substring(domain.indexOf('.') + 1);

        const tldsRequiringExtendedAttributes = ['us', 'eu', 'ca', 'co.uk', 'org.uk', 'me.uk', 'nu', 'com.au', 'net.au', 'org.au', 'es', 'nom.es', 'com.es', 'org.es', 'de', 'fr'];

        if (tldsRequiringExtendedAttributes.includes(tld)) {
            Unpurchased.push({ Domain: domain, Message: "This TLD is not supported yet." });
            continue;
        }

        const NonPremiumDomainPurchaseUrl = DomainPurchaseUrl + `&DomainName=${domain}`;

        try {
            const DomainPurchaseResponse = await axios.post(NonPremiumDomainPurchaseUrl);
            const DomainPurchaseResponseJson = await xml2js.parseStringPromise(DomainPurchaseResponse.data, {
                explicitArray: false,
                attrkey: '$'
            });

            if (DomainPurchaseResponseJson.ApiResponse.$.Status === 'ERROR') {
                const errorMessage = DomainPurchaseResponseJson.ApiResponse.Errors.Error._;
                Unpurchased.push({ Domain: domain, Message: errorMessage });
            } else {
                Purchased.push(domain);
                console.log(`${domain} domain purchased`);
            }

        } catch (err) {
            console.error(`Error purchasing domain ${domain}:`, err.message);
            Unpurchased.push({ Domain: domain, Message: err.message || "Unknown error" });
        }
    }

    console.log("Non premium domains purchased");

    for (const domain of Domains.PremiumDomains) {
        const tld = domain.Name.substring(domain.Name.indexOf('.') + 1);

        const tldsRequiringExtendedAttributes = ['us', 'eu', 'ca', 'co.uk', 'org.uk', 'me.uk', 'nu', 'com.au', 'net.au', 'org.au', 'es', 'nom.es', 'com.es', 'org.es', 'de', 'fr'];

        if (tldsRequiringExtendedAttributes.includes(tld)) {
            Unpurchased.push({ Domain: domain.Name, Message: "This TLD is not supported yet." });
            continue;
        }

        const PremiumDomainPurchaseUrl = DomainPurchaseUrl + `&DomainName=${domain.Name}&IsPremiumDomain=True&PremiumPrice=${domain.Price}&EapFee=${domain.EapFee}`;

        try {
            const DomainPurchaseResponse = await axios.post(PremiumDomainPurchaseUrl);
            const DomainPurchaseResponseJson = await xml2js.parseStringPromise(DomainPurchaseResponse.data, {
                explicitArray: false,
                attrkey: '$'
            });

            if (DomainPurchaseResponseJson.ApiResponse.$.Status === 'ERROR') {
                const errorMessage = DomainPurchaseResponseJson.ApiResponse.Errors.Error._;
                Unpurchased.push({ Domain: domain.Name, Message: errorMessage });
            } else {
                Purchased.push(domain.Name);
                console.log(`${domain.Name} domain purchased`);
            }

        } catch (err) {
            console.error(`Error purchasing domain ${domain.Name}:`, err.message);
            Unpurchased.push({ Domain: domain.Name, Message: err.message || "Unknown error" });
        }
    }

    console.log("Premium domains purchased");

    res.status(200).json({
        success: true,
        message: "Domains purchased successfully",
        Purchased,
        Unpurchased,
    });
});

exports.AddDomain = catchAsyncError(async (req, res, next) => {
    const { OrderId, DomainName, Price, EapFee, Type } = req.body;

    if (!OrderId || !DomainName) {
        return next(new ErrorHandler("All required fields are not provided", 400));
    }

    const Order = await OrderModel.findByPk(OrderId);

    if (!Order) {
        return next(new ErrorHandler("Order not found", 400));
    }

    if (Order.StripePaymentStatus !== "Succeeded") {
        return next(new ErrorHandler("Payment for this purchase has not been completed yet. Please try again later.", 400));
    }

    if (Order.DomainPurchaseStatus !== "Succeeded") {
        return next(new ErrorHandler("Domain purchase has not been completed yet. Please try again later.", 400));
    }

    if (Type === "Premium") {
        if (EapFee < 0 || typeof EapFee !== 'number' || isNaN(EapFee)) {
            return next(new ErrorHandler("EapFee is required for premium domains", 400));
        }
    }

    if (Price < 0 || typeof Price !== 'number' || isNaN(Price)) {
        return next(new ErrorHandler("Invalid price provided", 400));
    }

    if (req.body.Duration) {
        if (req.body.Duration < 0 || typeof req.body.Duration !== 'number' || isNaN(req.body.Duration)) {
            return next(new ErrorHandler("Invalid duration provided", 400));
        }
    }

    try {
        const Domain = await DomainModel.create({
            OrderId,
            DomainName,
            Price,
            EapFee: Type === "Premium" ? EapFee : null,
            Type,
            Duration: req.body.Duration || 1
        });

        res.status(200).json({
            success: true,
            message: "Domain added successfully",
            Domain
        });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return next(new ErrorHandler("This domain has already been purchased by someone else", 400));
        }
        return next(new ErrorHandler(err.message, 400));
    }
});

exports.GetDomains = catchAsyncError(async (req, res, next) => {
    const { CurrentWorkspaceId } = req.user?.User;

    const Orders = await OrderModel.findAll({
        where: { WorkspaceId: CurrentWorkspaceId }
    });

    if (Orders.length === 0) {
        return next(new ErrorHandler("No orders found", 400));
    }

    const Domains = await DomainModel.findAll({
        where: { OrderId: { [Op.in]: Orders.map(order => order.id) } }
    });

    res.status(200).json({
        success: true,
        message: "Domains retrieved successfully",
        domains: Domains
    });
});

// Zoho URL to get auth code for a zoho account for the firs time 
// https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=1000.E5TVABP1XJHT9VSKR2RWYKFKL7OTXO&scope=AaaServer.profile.Read,ZohoMail.organization.domains.ALL,ZohoMail.organization.accounts.ALL&redirect_uri=http://localhost:4000/EmailAccount/zoho/callback&access_type=offline&prompt=consent

exports.ZohoAccountCallback = catchAsyncError(async (req, res, next) => {
    const { code } = req.body;

    if (!code) {
        return next(new ErrorHandler("Authorization code not provided", 400));
    }

    const tokenResponse = await axios.post(`https://accounts.zoho.com/oauth/v2/token`,
        new URLSearchParams({
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            code,
            redirect_uri: process.env.ZOHO_REDIRECT_URI,
            grant_type: 'authorization_code',
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    await setAccessToken(access_token, expires_in);

    res.status(200).json({
        success: true,
        message: "Zoho account connected successfully",
        access_token,
        refresh_token,
        expires_in
    });
});

exports.ZohoRefreshToken = catchAsyncError(async (req, res, next) => {
    const tokenResponse = await axios.post(`https://accounts.zoho.com/oauth/v2/token`,
        new URLSearchParams({
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            refresh_token: process.env.ZOHO_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Update access token in Redis
    await setAccessToken(access_token, expires_in);

    res.status(200).json({
        success: true,
        message: "Zoho access token refreshed successfully",
    });
});

exports.ConfigureWebForwarding = catchAsyncError(async (req, res, next) => {
    const { Domain, ForwardingUrl } = req.body;

    if (!Domain || !ForwardingUrl) {
        return next(new ErrorHandler("All required fields are not provided", 400));
    }

    const WorkspaceDomain = await DomainModel.findOne({
        where: {
            DomainName: Domain
        }
    });

    if (!WorkspaceDomain) {
        return next(new ErrorHandler("This domain does not exist", 400));
    }

    const OrderId = WorkspaceDomain.OrderId;

    const Order = await OrderModel.findByPk(OrderId);

    if (!Order) {
        return next(new ErrorHandler("This domain is not purchased by this workspace.", 400));
    }

    if (Order.WorkspaceId !== req.user?.User?.CurrentWorkspaceId) {
        return next(new ErrorHandler("This domain is not associated with this workspace.", 400));
    }

    console.log("Domain found in workspace");

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const sld = Domain.split('.')[0];
    const tld = Domain.substring(Domain.indexOf('.') + 1);

    try {
        // Step 1: Set default nameservers
        const NameserverUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&Command=namecheap.domains.dns.setDefault&ClientIp=${process.env.CLIENT_IP}&SLD=${sld}&TLD=${tld}`;

        const NameserverResponseXml = await axios.post(NameserverUrl);
        const NameserverResponseJson = await xml2js.parseStringPromise(NameserverResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (NameserverResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(NameserverResponseJson.ApiResponse.Errors.Error._, 400));
        }

        console.log("Default nameservers set");



        // Step 2: Retrieving current DNS records
        const GetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getHosts`
            + `&SLD=${sld}`
            + `&TLD=${tld}`;

        const GetHostResponseXml = await axios.post(GetHostUrl);
        const GetHostResponseJson = await xml2js.parseStringPromise(GetHostResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (GetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(GetHostResponseJson.ApiResponse.Errors.Error._, 400));
        }

        const CurrentDnsRecords = GetHostResponseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;

        console.log("Current DNS records retrieved");


        // Step 3: Preserve current necessary DNS records
        let SetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.setHosts`
            + `&SLD=${sld}`
            + `&TLD=${tld}`;

        let allRecords = [];
        let counter = 1;

        const addRecord = (name, type, address, ttl = '3600', mxPref = '') => {
            const encodedAddress = encodeURIComponent(address);
            const base = `&HostName${counter}=${name}&RecordType${counter}=${type}&Address${counter}=${encodedAddress}&TTL${counter}=${ttl}`;
            const full = mxPref ? `${base}&MXPref${counter}=${mxPref}` : base;
            allRecords.push(full);
            counter++;
        };

        if (!Array.isArray(CurrentDnsRecords)) {
            CurrentDnsRecords = [CurrentDnsRecords];
        }

        for (const record of CurrentDnsRecords) {
            const r = record.$;
            const { Name, Type, Address } = r;

            const safeToPreserve =
                (Type === 'MX') ||
                (Type === 'TXT' && (
                    Name.includes('_dmarc') ||
                    Name.includes('_acme-challenge') ||
                    Name.includes('whoisguard') ||
                    Address.includes('v=spf1') ||
                    Address.includes('v=DKIM1') ||
                    Address.includes('zoho-verification')
                )) ||
                (Type === 'CNAME' && Name !== 'www') ||
                (Type === 'A' && Name !== '@' && Name !== 'www');

            if (safeToPreserve) {
                addRecord(Name, Type, Address, r.TTL, r.MXPref);
            }
        }


        if (allRecords.length > 0) {
            SetHostUrl += allRecords.join('');
        }

        console.log("Necessary DNS records preserved.");

        // Step 4: Add the web forwarding URL records to the DNS records for both www and @
        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=URL&Address${counter}=${ForwardingUrl}&TTL${counter}=1800`;
        counter++;
        SetHostUrl += `&HostName${counter}=www&RecordType${counter}=URL&Address${counter}=${ForwardingUrl}&TTL${counter}=1800`;
        counter++;

        console.log("Web forwarding URL records added.");

        // Step 5: Set the DNS records
        const SetHostResponseXml = await axios.post(SetHostUrl);
        const SetHostResponseJson = await xml2js.parseStringPromise(SetHostResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (SetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(SetHostResponseJson.ApiResponse.Errors.Error._, 400));
        }

        console.log("DNS records set successfully.");
    } catch (err) {
        console.error('Error in DNS update flow:', err?.response?.data || err.message);
        return next(new ErrorHandler(err?.response?.data?.data?.errorCode || err.message, 400));
    }


    WorkspaceDomain.WebForwardingConfiguration = true;
    WorkspaceDomain.WebForwardingUrl = ForwardingUrl;
    await WorkspaceDomain.save();

    res.status(200).json({
        success: true,
        message: "Web forwarding configured successfully",
        WebForwardingConfiguration: WorkspaceDomain.WebForwardingConfiguration,
        WebForwardingUrl: WorkspaceDomain.WebForwardingUrl
    });
});

exports.ConfigureEmailHosting = catchAsyncError(async (req, res, next) => {
    let { Domain } = req.body;
    Domain = Domain.toLowerCase();

    if (!Domain) {
        return next(new ErrorHandler("Domain name not provided", 400));
    }

    const WorkspaceDomain = await DomainModel.findOne({
        where: {
            DomainName: Domain
        }
    });

    if (!WorkspaceDomain) {
        return next(new ErrorHandler("This domain does not exist", 400));
    }

    const OrderId = WorkspaceDomain.OrderId;

    const Order = await OrderModel.findByPk(OrderId);


    if (!Order) {
        return next(new ErrorHandler("This domain is not purchased by this workspace.", 400));
    }

    if (Order.WorkspaceId !== req.user?.User?.CurrentWorkspaceId) {
        return next(new ErrorHandler("This domain is not associated with this workspace.", 400));
    }

    console.log("Domain found in workspace");


    const ConfigurationResults = { Updated: false, Message: null };
    const AccessToken = await getAccessToken();

    const sld = Domain.split('.')[0];
    const tld = Domain.substring(Domain.indexOf('.') + 1);

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const ZohoApiUrl = `https://mail.zoho.com/api/organization/${process.env.ZOHO_ORG_ID}/domains`;

    try {
        // Step 1: Setting default nameservers
        const NameserverUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&Command=namecheap.domains.dns.setDefault&ClientIp=${process.env.CLIENT_IP}&SLD=${sld}&TLD=${tld}`;

        const NameserverResponseXml = await axios.post(NameserverUrl);
        const NameserverResponseJson = await xml2js.parseStringPromise(NameserverResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (NameserverResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(NameserverResponseJson.ApiResponse.Errors.Error._, 400));
        }

        console.log("Default nameservers set");



        // Step 2: Retrieving current DNS records
        const GetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getHosts`
            + `&SLD=${sld}`
            + `&TLD=${tld}`;

        const GetHostResponseXml = await axios.post(GetHostUrl);
        const GetHostResponseJson = await xml2js.parseStringPromise(GetHostResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (GetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(GetHostResponseJson.ApiResponse.Errors.Error._, 400));
        }

        const CurrentDnsRecords = GetHostResponseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;

        console.log("Current DNS records retrieved");



        // Step 3: Preserving current necessary DNS records
        let SetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.setHosts`
            + `&SLD=${sld}`
            + `&TLD=${tld}`;

        let allRecords = [];
        let counter = 1;

        const addRecord = (name, type, address, ttl = '3600', mxPref = '') => {
            const encodedAddress = encodeURIComponent(address);
            const base = `&HostName${counter}=${name}&RecordType${counter}=${type}&Address${counter}=${encodedAddress}&TTL${counter}=${ttl}`;
            const full = mxPref ? `${base}&MXPref${counter}=${mxPref}` : base;
            allRecords.push(full);
            counter++;
        };

        if (!Array.isArray(CurrentDnsRecords)) {
            CurrentDnsRecords = [CurrentDnsRecords];
        }

        for (const record of CurrentDnsRecords) {
            const r = record.$;
            const { Name, Type, Address } = r;

            const safeToPreserve =
                (Type === 'CNAME' && Name === 'www') ||
                (Type === 'A' && Name === '@' && !Address.includes('parking')) ||
                (Type === 'TXT' && Name.includes('_dmarc')) ||
                (Type === 'TXT' && Name.includes('_acme-challenge')) ||
                (Type === 'URL' && Name === '@') ||
                (Type === 'URL' && Name === 'www') ||
                (Type === 'TXT' && !Address.includes('zoho-verification') && !Address.includes('v=spf1') && !Address.includes('v=DKIM1')) ||
                (Type === 'TXT' && Name.includes('whoisguard'));

            if (safeToPreserve) {
                addRecord(Name, Type, Address, r.TTL, r.MXPref);
            }
        }

        if (allRecords.length > 0) {
            SetHostUrl += allRecords.join('');
        }

        console.log("Necessary DNS records preserved.");



        // Step 4: Add the SPF record
        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=TXT&Address${counter}=v=spf1 include:zoho.com ~all&TTL${counter}=3600`;
        counter++;

        console.log("SPF record added.");



        // Step 5: Add the Custom MX records
        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=MX&Address${counter}=mx.zoho.com.&MXPref${counter}=10&TTL${counter}=3600`;
        counter++;
        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=MX&Address${counter}=mx2.zoho.com.&MXPref${counter}=20&TTL${counter}=3600`;
        counter++;
        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=MX&Address${counter}=mx3.zoho.com.&MXPref${counter}=50&TTL${counter}=3600`;
        counter++;
        SetHostUrl += `&EmailType=MX`;

        console.log("Custom MX records added.");



        // Step 6: Add Sendgrid CNAME records
        const SendgridGetAuthenticateDomainUrl = `https://api.sendgrid.com/v3/whitelabel/domains?domain=${Domain}`;

        const SendgridGetAuthenticateDomainResponse = await axios.get(SendgridGetAuthenticateDomainUrl, {
            headers: {
                "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (SendgridGetAuthenticateDomainResponse.data.length > 0) {
            console.log("Domain already exists in Sendgrid");

            const DnsRecords = SendgridGetAuthenticateDomainResponse.data[0].dns;

            SetHostUrl += `&HostName${counter}=${DnsRecords.mail_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.mail_cname.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.dkim1.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.dkim1.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.dkim2.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.dkim2.data}&TTL${counter}=3600`;
            counter++;

            console.log("Sendgrid CNAME Authentication records added.");
        } else {
            console.log("Domain does not exist in Sendgrid");

            const DomainAuthenticateSendgridUrl = "https://api.sendgrid.com/v3/whitelabel/domains";
            const headers = {
                "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
            }

            const DomainAuthenticateSendgridResponse = await axios.post(DomainAuthenticateSendgridUrl, {
                domain: Domain,
                automatic_security: true,
            }, {
                headers,
            });

            if (!DomainAuthenticateSendgridResponse?.data?.dns) {
                return next(new ErrorHandler("Domain authentication failed", 400));
            }

            const DnsRecords = DomainAuthenticateSendgridResponse.data.dns;

            SetHostUrl += `&HostName${counter}=${DnsRecords.mail_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.mail_cname.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.dkim1.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.dkim1.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.dkim2.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.dkim2.data}&TTL${counter}=3600`;
            counter++;

            console.log("Sendgrid CNAME Authentication records added.");
        }



        // Step 7: Add link branding CNAME records
        const CheckLinkBrandingUrl = `https://api.sendgrid.com/v3/whitelabel/links?domain=${Domain}`;
        const headers = {
            "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
        }

        const CheckLinkBrandingResponse = await axios.get(CheckLinkBrandingUrl, {
            headers,
        });

        if (CheckLinkBrandingResponse.data.length > 0) {
            console.log("Branded link for the domain already exists");

            const DnsRecords = CheckLinkBrandingResponse.data[0].dns;

            SetHostUrl += `&HostName${counter}=${DnsRecords.domain_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.domain_cname.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.owner_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.owner_cname.data}&TTL${counter}=3600`;
            counter++;

            console.log("Sendgrid link branding CNAME records added");
        } else {
            const AddLinkBrandingUrl = "https://api.sendgrid.com/v3/whitelabel/links";

            const AddLinkBrandingResponse = await axios.post(AddLinkBrandingUrl, {
                domain: Domain,
                subdomain: "quickpipe",
                default: true,
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });

            const DnsRecords = AddLinkBrandingResponse.data.dns;

            SetHostUrl += `&HostName${counter}=${DnsRecords.domain_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.domain_cname.data}&TTL${counter}=3600`;
            counter++;
            SetHostUrl += `&HostName${counter}=${DnsRecords.owner_cname.host}&RecordType${counter}=CNAME&Address${counter}=${DnsRecords.owner_cname.data}&TTL${counter}=3600`;
            counter++;

            console.log("Sendgrid link branding CNAME records added");
        }



        // Step 7: Add the domain to Zoho
        const AddDomainResponse = await axios.post(ZohoApiUrl, {
            domainName: Domain,
        }, {
            headers: {
                Authorization: `Zoho-oauthtoken ${AccessToken}`,
            },
        });

        if (AddDomainResponse.data.status.code !== 201) {
            return next(new ErrorHandler(AddDomainResponse.data.status.description, AddDomainResponse.data.status.code));
        }

        console.log("Domain added to Zoho");



        // Step 8: Add the CNAME TXT domain ownership proving record to the DNS records
        const VerificationCode = AddDomainResponse.data.data.CNAMEVerificationCode;

        SetHostUrl += `&HostName${counter}=@&RecordType${counter}=TXT&Address${counter}=zoho-verification=${VerificationCode}.zmverify.zoho.com&TTL${counter}=3600`;
        counter++;

        console.log("CNAME TXT domain ownership proving record added.");



        // Step 9: Set the DNS records
        const SetHostResponseXml = await axios.post(SetHostUrl);
        const SetHostResponseJson = await xml2js.parseStringPromise(SetHostResponseXml.data, { explicitArray: false, attrkey: '$' });

        if (SetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(SetHostResponseJson.ApiResponse.Errors.Error._, 400));
        }

        console.log("DNS records set successfully.");

        ConfigurationResults.Updated = true;
        ConfigurationResults.Message = "Domain email hosting configured successfully";
    } catch (err) {
        console.error('Error in DNS update flow:', err?.response?.data || err.message);
        ConfigurationResults.Error = err?.response?.data?.data?.errorCode || err.message;
    }

    WorkspaceDomain.MailHostingConfiguration = true;
    await WorkspaceDomain.save();

    res.status(200).json({
        success: ConfigurationResults.Updated,
        ConfigurationResults
    });
});

exports.VerifyEmailHosting = catchAsyncError(async (req, res, next) => {
    let { Domain } = req.body;
    Domain = Domain.toLowerCase();

    if (!Domain) {
        return next(new ErrorHandler("Domain name not provided", 400));
    }

    const WorkspaceDomain = await DomainModel.findOne({
        where: {
            DomainName: Domain
        }
    });

    if (!WorkspaceDomain) {
        return next(new ErrorHandler("This domain does not exist", 400));
    }

    const OrderId = WorkspaceDomain.OrderId;

    const Order = await OrderModel.findByPk(OrderId);

    if (!Order) {
        return next(new ErrorHandler("This domain is not purchased by this workspace.", 400));
    }

    if (Order.WorkspaceId !== req.user?.User?.CurrentWorkspaceId) {
        return next(new ErrorHandler("This domain is not associated with this workspace.", 400));
    }

    console.log("Domain found in workspace");

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const sld = Domain.split('.')[0];
    const tld = Domain.substring(Domain.indexOf('.') + 1);

    const AccessToken = await getAccessToken();

    const ZohoApiUrl = `https://mail.zoho.com/api/organization/${process.env.ZOHO_ORG_ID}/domains/${Domain}`;

    const VerificationProgress = {
        Ownership: {
            Success: false,
            Message: "Domain ownership verification could not be conducted",
        },
        EmailHosting: {
            Success: false,
            Message: "Email hosting enabling could not be conducted",
        },
        MX: {
            Success: false,
            Message: "MX record verification could not be conducted",
        },
        SPF: {
            Success: false,
            Message: "SPF record verification could not be conducted",
        },
        DKIMAddZoho: {
            Success: false,
            Message: "DKIM record could not be added to zoho",
        },
        DKIMAddDomain: {
            Success: false,
            Message: "DKIM record could not be added to domain",
        },
        DKIMVerify: {
            Success: false,
            Message: "DKIM record verification could not be conducted",
        },
        SendgridDomainValidate: {
            Success: false,
            Message: "Sendgrid domain validation could not be conducted",
        },
        LinkBrandingValidate: {
            Success: false,
            Message: "Link branding validation could not be conducted",
        }
    };

    console.log("Domain verification started");

    let DomainDetails = null;

    // Step 1: Get the domain information
    try {
        const GetDomainInfoResponse = await axios.get(ZohoApiUrl, {
            headers: {
                Authorization: `Zoho-oauthtoken ${AccessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        DomainDetails = GetDomainInfoResponse.data.data;
    } catch (error) {
        const response = error.response.data;
        if (response.status.code !== 200) {
            res.status(404).json({
                success: false,
                message: `Domain not found`,
                VerificationProgress
            });
        }
    }

    let DkimRecords = null;
    let DkimRecord = null;

    if (DomainDetails.dkimDetailList) {
        DkimRecords = DomainDetails.dkimDetailList;

        if (!Array.isArray(DkimRecords)) {
            DkimRecords = [DkimRecords];
        }

        if (DkimRecords.length > 0) {
            for (const dkimRecord of DkimRecords) {
                if (dkimRecord.selector === "quickpipe") {
                    DkimRecord = dkimRecord;
                }
            }
        }
    }

    console.log("Domain information retrieved");
    console.log(DomainDetails);

    // Step 2: Verify domain ownership
    if (!DomainDetails.verificationStatus) {
        try {
            VerifyOwnershipResponse = await axios.put(ZohoApiUrl, {
                "mode": "verifyDomainByTXT"
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${AccessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
        } catch (error) {
            const response = error.response.data;
            VerificationProgress.Ownership.Message = "Domain ownership verification failed. Please try again later.";
            res.status(422).json({
                success: false,
                message: `Ownership Verification Error: ${response.data.error} -- ${response.data.message}`,
                VerificationProgress
            });
        }
    }

    VerificationProgress.Ownership.Success = true;
    VerificationProgress.Ownership.Message = "Domain ownership verified successfully";

    console.log("Domain ownership verified");


    // Step 3: Enable Email Hosting
    try {
        const EmailHostingResponse = await axios.put(ZohoApiUrl, {
            "mode": "enableMailHosting"
        }, {
            headers: {
                Authorization: `Zoho-oauthtoken ${AccessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    } catch (error) {
        const response = error.response.data;
        if (!(response.status.code === 400 && response.data.moreInfo === "MailHosting is already enabled for the domain " + Domain)) {
            VerificationProgress.EmailHosting.Message = "Email hosting enabling failed. Please try again later.";
            res.status(422).json({
                success: false,
                message: `Email Hosting Enabling Error: ${response.status.description} -- ${response.data.moreInfo}`,
                VerificationProgress
            });
        }
    }

    VerificationProgress.EmailHosting.Success = true;
    VerificationProgress.EmailHosting.Message = "Email hosting enabled successfully";

    console.log("Email hosting enabled.");

    // Step 4: Verify MX record
    try {
        const VerifyMXResponse = await axios.put(ZohoApiUrl, {
            "mode": "verifyMxRecord",
        }, {
            headers: {
                Authorization: `Zoho-oauthtoken ${AccessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    } catch (error) {
        const response = error.response.data;
        console.log(response);
        if (response.status.code !== 200) {
            VerificationProgress.MX.Message = "MX record verification failed. Please try again later.";
            res.status(422).json({
                success: false,
                message: `MX Verification Error: ${response.status.description} -- ${response.data.moreInfo}`,
                VerificationProgress
            });
        }
    }

    VerificationProgress.MX.Success = true;
    VerificationProgress.MX.Message = "MX record verified successfully";

    console.log("MX record verified");


    // Step 5: Verify SPF record
    if (!DomainDetails.spfstatus) {
        try {
            const VerifySPFResponse = await axios.put(ZohoApiUrl, {
                "mode": "VerifySpfRecord",
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${AccessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
        } catch (error) {
            const response = error.response.data;
            if (!response.data.spfstatus) {
                VerificationProgress.SPF.Message = "SPF record verification failed. Please try again later.";
                res.status(422).json({
                    success: false,
                    message: `SPF Verification Error: ${response.status.description} -- ${response.data.moreInfo}`,
                    VerificationProgress
                });
            }
        }
    }

    VerificationProgress.SPF.Success = true;
    VerificationProgress.SPF.Message = "SPF record verified successfully";

    console.log("SPF record verified");


    // Step 6: Add DKIM record if not already added and verify it if not already verified
    let AddDkimZoho = false;
    let AddDkimDomain = true;
    let VerifyDkim = false;

    if (DkimRecord !== null) {
        if (!DkimRecord.isVerified) {
            VerifyDkim = true;
        }
    } else {
        AddDkimZoho = true;
        VerifyDkim = true;
    }

    // Get all previous host
    const GetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getHosts`
        + `&SLD=${sld}`
        + `&TLD=${tld}`;

    const GetHostResponseXml = await axios.post(GetHostUrl);
    const GetHostResponseJson = await xml2js.parseStringPromise(GetHostResponseXml.data, { explicitArray: false, attrkey: '$' });

    if (GetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(GetHostResponseJson.ApiResponse.Errors.Error._, 400));
    }

    const CurrentDnsRecords = GetHostResponseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;

    console.log("Current DNS records retrieved");

    // Re-Add all previous host
    let SetHostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.setHosts`
        + `&SLD=${sld}`
        + `&TLD=${tld}`;

    let allRecords = [];
    let counter = 1;

    const addRecord = (name, type, address, ttl = '3600', mxPref = '') => {
        const encodedAddress = encodeURIComponent(address);
        const base = `&HostName${counter}=${name}&RecordType${counter}=${type}&Address${counter}=${encodedAddress}&TTL${counter}=${ttl}`;
        const full = mxPref ? `${base}&MXPref${counter}=${mxPref}` : base;
        allRecords.push(full);
        counter++;
    };

    if (!Array.isArray(CurrentDnsRecords)) {
        CurrentDnsRecords = [CurrentDnsRecords];
    }

    for (const record of CurrentDnsRecords) {
        const r = record.$;
        const { Name, Type, Address } = r;

        // Skip DKIM records
        if (Name.includes('_domainkey')) {
            AddDkimDomain = false;
        }

        addRecord(Name, Type, Address, r.TTL, r.MXPref);
    }

    if (allRecords.length > 0) {
        SetHostUrl += allRecords.join('');
    }

    console.log("Previous DNS records preserved");

    console.log("AddDkimZoho:", AddDkimZoho);
    console.log("VerifyDkim:", VerifyDkim);
    console.log("AddDkimDomain:", AddDkimDomain);

    // Add DKIM to zoho domain
    let AddDKIMZohoReponse = null;
    if (AddDkimZoho) {
        try {
            AddDKIMZohoReponse = await axios.put(ZohoApiUrl, {
                "mode": "addDkimDetail",
                "selector": "quickpipe",
                "isDefault": true,
                "keySize": 1024
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${AccessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
        } catch (error) {
            const response = error.response.data;
            if (response.status.code !== 200) {
                VerificationProgress.DKIMAddZoho.Message = "DKIM record addition to zoho failed. Please try again later.";
                res.status(422).json({
                    success: false,
                    message: `DKIM Addition to Zoho Error: ${response.status.description} -- ${response.data.moreInfo}`,
                    VerificationProgress
                });
            }
        }

        VerificationProgress.DKIMAddZoho.Success = true;
        VerificationProgress.DKIMAddZoho.Message = "DKIM record added to zoho successfully";

        console.log("DKIM record added to zoho");
    } else {
        VerificationProgress.DKIMAddZoho.Success = true;
        VerificationProgress.DKIMAddZoho.Message = "DKIM already exists in zoho";
        console.log("DKIM already exists in zoho");
    }

    // Add DKIM to domain
    if (AddDkimDomain) {
        const DkimDetails = AddDKIMZohoReponse === null ? DkimRecord : AddDKIMZohoReponse.data.data;

        const encodedDkimValue = encodeURIComponent(DkimDetails.publicKey.trim());
        SetHostUrl += `&HostName${counter}=${DkimDetails.selector}._domainkey&RecordType${counter}=TXT&Address${counter}=${DkimDetails.publicKey}&TTL${counter}=3600`;
        counter++;
        console.log("SetHostUrl:", SetHostUrl);

        const SetHostResponseXml = await axios.post(SetHostUrl);
        const SetHostResponseJson = await xml2js.parseStringPromise(SetHostResponseXml.data, { explicitArray: false, attrkey: '$' });
        console.log("SetHostResponseJson:", SetHostResponseJson.ApiResponse.CommandResponse.DomainDNSSetHostsResult);
        if (SetHostResponseJson.ApiResponse.$.Status === 'ERROR') {
            return next(new ErrorHandler(`DKIM Addition to Domain Error: ${SetHostResponseJson.ApiResponse.Errors.Error._}`, 400));
        }

        VerificationProgress.DKIMAddDomain.Success = true;
        VerificationProgress.DKIMAddDomain.Message = "DKIM record added to domain successfully";

        console.log("DKIM record added to domain");
    } else {
        VerificationProgress.DKIMAddDomain.Success = true;
        VerificationProgress.DKIMAddDomain.Message = "DKIM record already exists in domain";
        console.log("DKIM record already exists in domain");
    }

    // Verify DKIM record
    if (VerifyDkim) {
        try {
            const VerifyDkimResponse = await axios.put(ZohoApiUrl, {
                "mode": "verifyDkimKey",
                "dkimId": DkimRecord.dkimId,
            }, {
                headers: {
                    Authorization: `Zoho-oauthtoken ${AccessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
        } catch (error) {
            const response = error.response.data;
            if (response.status.code !== 200) {
                VerificationProgress.DKIMVerify.Message = "DKIM record verification failed. Please try again later.";
                res.status(422).json({
                    success: false,
                    message: `${response.status.description} -- ${response.data.moreInfo}`,
                    VerificationProgress
                });
            }
        }

        VerificationProgress.DKIMVerify.Success = true;
        VerificationProgress.DKIMVerify.Message = "DKIM record verified successfully";

        console.log("DKIM record verified");
    } else {
        VerificationProgress.DKIMVerify.Success = true;
        VerificationProgress.DKIMVerify.Message = "DKIM record already verified";
        console.log("DKIM record already verified");
    }

    // Validate domain in sendgrid
    const CheckSendgridDomainUrl = `https://api.sendgrid.com/v3/whitelabel/domains?domain=${Domain}`;
    const headers = {
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
    }

    const CheckSendgridDomainResponse = await axios.get(CheckSendgridDomainUrl, {
        headers,
    });

    if (CheckSendgridDomainResponse.data.length > 0) {
        const CheckSendgridDomainId = CheckSendgridDomainResponse.data[0].id;

        const ValidateSendgridDomainUrl = `https://api.sendgrid.com/v3/whitelabel/domains/${CheckSendgridDomainId}/validate`;

        try {
            const ValidateSendgridDomainResponse = await axios.post(ValidateSendgridDomainUrl, null, {
                headers,
            });

            if (ValidateSendgridDomainResponse.data.valid) {
                VerificationProgress.SendgridDomainValidate.Success = true;
                VerificationProgress.SendgridDomainValidate.Message = "Sendgrid domain validated successfully";
                console.log("Sendgrid domain validated successfully");
            } else {
                VerificationProgress.SendgridDomainValidate.Success = false;
                VerificationProgress.SendgridDomainValidate.Message = "Sendgrid domain couldn't be validated completely. Please try again later.";
                res.status(422).json({
                    success: false,
                    message: "Sendgrid Domain Validation Error -- Sendgrid domain couldn't be validated completely. Please try again later.",
                    VerificationProgress
                });
            }
        } catch (error) {
            const response = error.response.data;
            VerificationProgress.SendgridDomainValidate.Success = false;
            VerificationProgress.SendgridDomainValidate.Message = response.errors[0].message;
            console.log("Sendgrid domain validation failed. Please try again later.");
            res.status(422).json({
                success: false,
                message: "Sendgrid Domain Validation Error -- " + response.errors[0].message,
                VerificationProgress
            });
        }
    } else {
        VerificationProgress.SendgridDomainValidate.Success = false;
        VerificationProgress.SendgridDomainValidate.Message = "Sendgrid domain doesn't exist";
        console.log("Sendgrid domain doesn't exist");
        res.status(422).json({
            success: false,
            message: "Sendgrid Domain Validation Error -- Sendgrid domain doesn't exist",
            VerificationProgress
        });
    }


    // Validate link branding in domain
    const CheckLinkBrandingDomainUrl = `https://api.sendgrid.com/v3/whitelabel/links?domain=${Domain}`;

    const CheckLinkBrandingDomainResponse = await axios.get(CheckLinkBrandingDomainUrl, {
        headers,
    });

    if (CheckLinkBrandingDomainResponse.data.length > 0) {
        const CheckLinkBrandingDomainId = CheckLinkBrandingDomainResponse.data[0].id;

        const ValidateLinkBrandingDomainUrl = `https://api.sendgrid.com/v3/whitelabel/links/${CheckLinkBrandingDomainId}/validate`;

        try {
            const ValidateLinkBrandingDomainResponse = await axios.post(ValidateLinkBrandingDomainUrl, null, {
                headers,
            });

            if (ValidateLinkBrandingDomainResponse.data.valid) {
                VerificationProgress.LinkBrandingValidate.Success = true;
                VerificationProgress.LinkBrandingValidate.Message = "Link branding validated successfully";
                console.log("Link branding validated successfully");
            } else {
                VerificationProgress.LinkBrandingValidate.Success = false;
                VerificationProgress.LinkBrandingValidate.Message = "Link branding couldn't be validated completely. Please try again later.";
                res.status(422).json({
                    success: false,
                    message: "Link Branding Validation Error -- Link branding couldn't be validated completely. Please try again later.",
                    VerificationProgress
                });
            }
        } catch (error) {
            const response = error.response.data;
            VerificationProgress.LinkBrandingValidate.Success = false;
            VerificationProgress.LinkBrandingValidate.Message = response.errors[0].message;
            console.log("Link branding validation failed. Please try again later.");
            res.status(422).json({
                success: false,
                message: "Link Branding Validation Error -- " + response.errors[0].message,
                VerificationProgress
            });
        }
    } else {
        VerificationProgress.LinkBrandingValidate.Success = false;
        VerificationProgress.LinkBrandingValidate.Message = "Link branding for this domain doesn't exist";
        console.log("Link branding for this domain doesn't exist");
        res.status(422).json({
            success: false,
            message: "Link Branding Validation Error -- Link branding for this domain doesn't exist",
            VerificationProgress
        });
    }

    WorkspaceDomain.Verification = true;
    await WorkspaceDomain.save();

    res.status(200).json({
        success: true,
        message: "Domain verification completed successfully",
        VerificationProgress
    });
});

exports.GetDomainStatus = catchAsyncError(async (req, res, next) => {
    const { DomainId } = req.body;

    if (!DomainId) {
        return next(new ErrorHandler("Domain ID not provided", 400));
    }

    const Domain = await DomainModel.findByPk(DomainId);

    if (!Domain) {
        return next(new ErrorHandler("Domain not found", 400));
    }

    const OrderId = Domain.OrderId;

    const Order = await OrderModel.findByPk(OrderId);

    if (!Order) {
        return next(new ErrorHandler("This domain is not purchased by this workspace.", 400));
    }

    if (Order.WorkspaceId !== req.user?.User?.CurrentWorkspaceId) {
        return next(new ErrorHandler("This domain is not associated with this workspace.", 400));
    }

    res.status(200).json({
        success: true,
        message: "Domain status retrieved successfully",
        MailHostingConfiguration: Domain.MailHostingConfiguration,
        Verification: Domain.Verification,
        WebForwardingConfiguration: Domain.WebForwardingConfiguration,
        WebForwardingUrl: Domain.WebForwardingUrl
    });
});

exports.GetDomainDNSDetails = catchAsyncError(async (req, res, next) => {
    let { Domain } = req.body;
    Domain = Domain.toLowerCase();

    const sld = Domain.split('.')[0];
    const tld = Domain.substring(Domain.indexOf('.') + 1);

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const HostUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getHosts`
        + `&SLD=${sld}`
        + `&TLD=${tld}`;

    const NameserverUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getList`
        + `&SLD=${sld}`
        + `&TLD=${tld}`;

    const HostResponseXml = await axios.post(HostUrl);
    const HostResponseJson = await xml2js.parseStringPromise(HostResponseXml.data, { explicitArray: false, attrkey: '$' });

    const NameserverResponseXml = await axios.post(NameserverUrl);
    const NameserverResponseJson = await xml2js.parseStringPromise(NameserverResponseXml.data, { explicitArray: false, attrkey: '$' });

    if (HostResponseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(HostResponseJson.ApiResponse.Errors.Error._, 400));
    }

    if (NameserverResponseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(NameserverResponseJson.ApiResponse.Errors.Error._, 400));
    }

    const DnsRecords = HostResponseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;
    const NsRecords = NameserverResponseJson.ApiResponse.CommandResponse.DomainDNSGetListResult.Nameserver;

    res.status(200).json({
        success: true,
        message: "DNS details retrieved successfully",
        DnsRecords: DnsRecords || [],
        NsRecords: NsRecords || []
    });
});

exports.CreateZohoMailbox = catchAsyncError(async (req, res, next) => {
    const { UserName, EmailUserName, DomainNames, AlertEmailAddress } = req.body;

    if (!UserName || !EmailUserName || DomainNames.length === 0 || !AlertEmailAddress) {
        return next(new ErrorHandler("All required fields are not provided", 400));
    }

    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Orders = await OrderModel.findAll({
        where: {
            WorkspaceId: WorkspaceId,
            DomainPurchaseStatus: "Succeeded",
            StripePaymentStatus: "Succeeded"
        }
    });

    const Domains = await DomainModel.findAll({
        where: {
            OrderId: {
                [Op.in]: Orders.map(order => order.id)
            },
            MailHostingConfiguration: true,
            Verification: true
        }
    });

    const MailAccounts = [];
    const FailedAccounts = [];

    const AccessToken = await getAccessToken();

    for (const DomainName of DomainNames) {
        const Domain = Domains.find(domain => domain.DomainName === DomainName);

        if (!Domain) {
            FailedAccounts.push({
                EmailAddress: EmailUserName.toLowerCase() + '@' + DomainName.toLowerCase(),
                Error: "Domain is not associated with this workspace"
            });
            continue;
        }

        const EmailAddress = EmailUserName.toLowerCase() + '@' + DomainName.toLowerCase();
        const Password = GenerateRandomPassword();


        try {
            const response = await axios.post(
                `https://mail.zoho.com/api/organization/${process.env.ZOHO_ORG_ID}/accounts`,
                {
                    primaryEmailAddress: EmailAddress,
                    password: Password,
                    firstName: UserName.split(" ")[0] || UserName,
                    lastName: UserName.split(" ")[1] || "",
                    displayName: UserName,
                    userExpiry: 100,
                    role: "member", // member, admin, superadmin
                    country: "us",
                    language: "en",
                    timeZone: "America/New_York",
                    oneTimePassword: true,
                },
                {
                    headers: {
                        Authorization: `Zoho-oauthtoken ${AccessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );

            console.log("Zoho Account Response:", response.data);

            await SendZohoAccountCreationEmail(AlertEmailAddress, EmailAddress, Password);

            MailAccounts.push(EmailAddress);
        } catch (error) {
            console.error('Error creating Zoho mail account:', error?.response?.data || error.message);
            FailedAccounts.push({
                EmailAddress,
                Error: error?.response?.data?.data?.moreInfo
            });
        }
    }

    for (const EmailAddress of MailAccounts) {
        await EmailAccountModel.create({
            WorkspaceId,
            Email: EmailAddress,
            Provider: "Zoho",
            RefreshToken: process.env.ZOHO_REFRESH_TOKEN,
            AccessToken,
            ExpiresIn: new Date(Date.now() + 1000 * 60 * 60)
        });
    }

    res.status(200).json({
        success: true,
        message: "Zoho mail accounts created successfully",
        MailAccounts,
        FailedAccounts
    });
});

exports.GetMailHostingDomains = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Orders = await OrderModel.findAll({
        where: {
            WorkspaceId: WorkspaceId,
            DomainPurchaseStatus: "Succeeded",
            StripePaymentStatus: "Succeeded"
        }
    });

    const Domains = await DomainModel.findAll({
        where: {
            OrderId: {
                [Op.in]: Orders.map(order => order.id)
            },
            MailHostingConfiguration: true,
            Verification: true
        }
    });

    res.status(200).json({
        success: true,
        message: "Mail hosting domains retrieved successfully",
        Domains: Domains.map(domain => domain.DomainName) || []
    });
});

/* PART 2: Hassle-free Email Setup | Gmail/Google Suite */

exports.ReadyGmailAccount = catchAsyncError(async (req, res, next) => {
    const authUrl = GmailOauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GmailScopes,
    });

    res.status(200).json({
        success: true,
        message: "Gmail account is ready to be connected",
        url: authUrl
    });
});

exports.GmailAccountCallback = catchAsyncError(async (req, res, next) => {
    const { code } = req.query;

    if (!code) {
        return next(new ErrorHandler("Authorization code not provided", 400));
    }

    const { tokens } = await GmailOauth2Client.getToken(code);

    if (!tokens) {
        return next(new ErrorHandler("Failed to retrieve tokens", 400));
    }

    GmailOauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: GmailOauth2Client,
        version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();

    try {
        const emailAccount = await EmailAccountModel.create({
            WorkspaceId: req.user.User.CurrentWorkspaceId,
            Email: data.email,
            Provider: "Google",
            RefreshToken: tokens.refresh_token,
            AccessToken: tokens.access_token,
            ExpiresIn: tokens.expiry_date,
        });

        res.status(200).json({
            success: true,
            message: "Gmail account connected successfully",
            emailAccount
        });
    } catch (error) {
        if (error.code === 11000 || error.message.includes('duplicate key')) {
            return next(new ErrorHandler("This Gmail account is already connected.", 409));
        }
        return next(new ErrorHandler("Failed to create email account", 500));
    }
});

/* PART 3: Ready to send Accounts | Microsoft Office 365 Suite*/

exports.ReadyMicrosoftAccount = catchAsyncError(async (req, res, next) => {
    const scopes = OutlookScopes.join(' ');

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${ClientId}&response_type=code&redirect_uri=${RedirectUri}&response_mode=query&scope=${encodeURIComponent(scopes)}`;

    res.status(200).json({
        success: true,
        message: "Microsoft account is ready to be connected",
        url: authUrl
    });
});

exports.MicrosoftAccountCallback = catchAsyncError(async (req, res, next) => {
    const { code } = req.query;

    if (!code) {
        return next(new ErrorHandler("Authorization code not provided", 400));
    }

    try {
        const tokenResponse = await axios.post(`https://login.microsoftonline.com/common/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: ClientId,
                client_secret: ClientSecret,
                code,
                redirect_uri: RedirectUri,
                grant_type: 'authorization_code',
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
    } catch (error) {
        console.log(error.response.data.error_description);
        return next(new ErrorHandler(error.response.data.error_description, 400));
    }

    console.log("Token generated");
    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    });
    console.log("got user response");

    const userEmail = userResponse.data.userPrincipalName || userResponse.data.mail;

    try {
        const emailAccount = await EmailAccountModel.create({
            WorkspaceId: req.user.User.CurrentWorkspaceId,
            Email: userEmail,
            Provider: "Microsoft",
            RefreshToken: refresh_token,
            AccessToken: access_token,
            ExpiresIn: Date.now() + (expires_in * 1000),
        });

        res.status(200).json({
            success: true,
            message: "Microsoft account connected successfully",
            emailAccount
        });
    } catch (error) {
        if (error.code === 11000 || error.message.includes('duplicate key')) {
            return next(new ErrorHandler("This Microsoft account is already connected.", 409));
        }
        return next(new ErrorHandler("Failed to create email account", 500));
    }
});












exports.Sendgrid = catchAsyncError(async (req, res, next) => {
    const url = "https://api.sendgrid.com/v3/mail/send";

    const messages = [];

    // 1. Email to receive1@gmail.com — workspace1, campaign1, from send1@gmail.com
    messages.push({
        personalizations: [{
            to: [{ email: "ahadaziz4@gmail.com", name: "Aneeq Muneer" }],
            subject: "Test Campaign Email",
            custom_args: {
                workspaceId: "cee2cb46-9bc0-4819-9dbf-bdcd35e879f5",
                campaignId: "campaign1",
                senderEmail: "aneeq@quickpipe.xyz",
                receiverName: "Aneeq Muneer",
                receiverEmail: "ahadaziz4@gmail.com"
            },
            categories: ["workspace1", "campaign1", "aneeq@quickpipe.xyz"]
        }],
        from: { email: "aneeq@quickpipe.xyz" },
        content: [{
            type: "text/html",
            value: `<strong>Hello!</strong><br/>
  This email is part of <em>workspace1</em>, campaign1, sent from aneeq@quickpipe.xyz.<br/><br/>
  <a href="https://example.com/test-link?user=ahadaziz4@gmail.com" target="_blank">Click here to test tracking</a><br/><br/>
  Thanks!<br/>
  — Aneeq`
        }],
        tracking_settings: {
            click_tracking: { enable: true, enable_text: true },
            open_tracking: { enable: true }
        }
    });

    // 2. Email to receive2@gmail.com — workspace1, campaign2, from send2@gmail.com
    messages.push({
        personalizations: [{
            to: [{ email: "ahad.aziz.jaffer@gmail.com", name: "Arham Muneer" }],
            subject: "Test Campaign Email",
            custom_args: {
                workspaceId: "cee2cb46-9bc0-4819-9dbf-bdcd35e879f5",
                campaignId: "campaign2",
                senderEmail: "arham@quickpipe.xyz",
                receiverName: "Arham Muneer",
                receiverEmail: "ahad.aziz.jaffer@gmail.com"
            },
            categories: ["workspace1", "campaign2", "arham@quickpipe.xyz"]
        }],
        from: { email: "arham@quickpipe.xyz" },
        content: [{
            type: "text/html",
            value: `<strong>Hello!</strong><br/>
  This email is part of <em>workspace1</em>, campaign2, sent from arham@quickpipe.xyz.<br/><br/>
  <a href="https://example.com/test-link?user=ahad.aziz.jaffer@gmail.com" target="_blank">Click here to test tracking</a><br/><br/>
  Thanks!<br/>
  — Aneeq`
        }],
        tracking_settings: {
            click_tracking: { enable: true, enable_text: true },
            open_tracking: { enable: true }
        }
    });

    // 3. Email to receive3@gmail.com — workspace2, campaign1, from send1@gmail.com
    messages.push({
        personalizations: [{
            to: [{ email: "yourdadpro999@gmail.com", name: "Your Dad" }],
            subject: "Test Campaign Email",
            custom_args: {
                workspaceId: "cee2cb46-9bc0-4819-9dbf-bdcd35e879f5",
                campaignId: "campaign1",
                senderEmail: "aneeq@quickpipe.xyz",
                receiverName: "Your Dad",
                receiverEmail: "yourdadpro999@gmail.com"
            },
            categories: ["workspace2", "campaign1", "aneeq@quickpipe.xyz"]
        }],
        from: { email: "aneeq@quickpipe.xyz" },
        content: [{
            type: "text/html",
            value: `<strong>Hello!</strong><br/>
  This email is part of <em>workspace2</em>, campaign1, sent from aneeq@quickpipe.xyz.<br/><br/>
  <a href="https://example.com/test-link?user=yourdadpro999@gmail.com" target="_blank">Click here
  Thanks!<br/>
  — Aneeq`
        }],
        tracking_settings: {
            click_tracking: { enable: true, enable_text: true },
            open_tracking: { enable: true }
        }
    });

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        // Send each message separately to ensure distinct tagging
        for (const msg of messages) {
            await axios.post(url, msg, { headers });
        }
        res.status(200).json({ success: true, message: "All test emails sent successfully" });
    } catch (error) {
        console.error(error.response?.data || error);
        res.status(500).json({ success: false, error: "Failed to send test emails" });
    }
});

exports.Sendgrid1 = catchAsyncError(async (req, res, next) => {
    const startDate = "2025-06-29";
    const endDate = "2025-06-29";
    const url = `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await axios.get(url, { headers });
        res.status(200).json({ success: true, stats: response.data });
    } catch (error) {
        console.log(error.response?.data);
        res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
});

exports.Sendgrid2 = catchAsyncError(async (req, res, next) => {
    // get current year and then start and end date should be the first and last day of the year
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;
    const workspaceId = "workspace1";
    const campaignId = "campaign1";

    console.log(`Querying SendGrid stats for date: ${startDate}`);
    console.log(`Categories being queried: ${workspaceId}, ${campaignId}`);

    const url = `https://api.sendgrid.com/v3/categories/stats?start_date=${startDate}&end_date=${endDate}&categories=${workspaceId}&aggregated_by=day`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        const { data } = await axios.get(url, { headers });
        console.log('SendGrid response:', JSON.stringify(data, null, 2));
        res.status(200).json({ success: true, stats: data });
    } catch (error) {
        console.error('SendGrid API Error:', error.response?.data);
        console.error('Full error:', error.message);

        if (error.response?.data?.errors) {
            res.status(500).json({
                success: false,
                error: error.response.data.errors[0].message,
                details: error.response.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to fetch SendGrid stats",
                details: error.message
            });
        }
    }
});

exports.Sendgrid3 = catchAsyncError(async (req, res, next) => {
    console.log('Fetching all available categories from SendGrid...');

    const url = `https://api.sendgrid.com/v3/categories`;

    const headers = {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await axios.get(url, { headers });
        console.log(response);
        console.log('Available categories:', JSON.stringify(response.data, null, 2));
        res.status(200).json({
            success: true,
            categories: response.data,
            count: response.data.length
        });
    } catch (error) {
        console.error('SendGrid Categories API Error:', error.response?.data);
        console.error('Full error:', error.message);

        if (error.response?.data?.errors) {
            res.status(500).json({
                success: false,
                error: error.response.data.errors[0].message,
                details: error.response.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Failed to fetch SendGrid categories",
                details: error.message
            });
        }
    }

    // const msg = {
    //     to: 'aneeq.muneer03@gmail.com',
    //     from: 'aneeq@quickpipe.xyz',
    //     subject: 'Sending with SendGrid is Fun',
    //     text: 'and easy to do anywhere, even with Node.js',
    //     html: '<p>and easy to do anywhere, even with Node.js</p>',
    //     categories: ['workspace1', 'campaign1', 'aneeq@quickpipe.xyz'],
    // };

    // try {
    //     await SgMail.send(msg);
    //     console.log('Email sent successfully');
    // } catch (error) {
    //     console.error(error);
    //     if (error.response) {
    //         console.error(error.response.body)
    //     }
    // }
});

exports.SendgridWebhook = catchAsyncError(async (req, res, next) => {
    const events = Array.isArray(req.body) ? req.body : [];
    console.log("here");
    const io = req.app.get('io');

    events.forEach(evt => {
        try {
            const workspaceId = evt.workspaceId || null;
            if (!workspaceId) return;

            const payload = {
                workspaceId,
                campaignId: evt.campaignId || 'N/A',
                receiverName: evt.receiverName || '',
                receiverEmail: evt.receiverEmail || '',
                url: evt.url || '',
                response: evt.response || '',
                event: evt.event,
                timestamp: evt.timestamp ? new Date(evt.timestamp * 1000).toLocaleString() : 'N/A'
            };

            io.to(`Workspace_${workspaceId}`).emit('sendgrid_event', payload);

            console.log(`Emitted "${evt.event}" event from email address ${evt.receiverEmail} to "Workspace_${workspaceId}":`, payload);

        } catch (err) {
            console.error('Error processing Sendgrid event:', err, evt);
        }
    });

    res.status(200).send('OK');
});
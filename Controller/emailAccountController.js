const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require('googleapis');
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const xml2js = require("xml2js");

const EmailAccountModel = require("../Model/emailAccountModel");

const { GmailOauth2Client, GmailScopes, MicrosoftEmailAccountDetails } = require("../Utils/emailAccountsUtils");
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
    const tldRegistrableResponse = await axios.post(tldRegistrableUrl, { Tlds: tlds });
    const tldRegistrable = tldRegistrableResponse.data.registrable;

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

    const checkResponseXml = await axios.get(checkUrl);
    const checkResponseJson = await xml2js.parseStringPromise(checkResponseXml.data, { explicitArray: false, attrkey: '$' });

    if (checkResponseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(checkResponseJson.ApiResponse.Errors.Error._, 400));
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

                totalPrice += parseFloat(entry.$.PremiumRegistrationPrice);
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

exports.UpdateDomainDNS = catchAsyncError(async (req, res, next) => {
    const { PurchasedDomains } = req.body;

    const ConfigurationResults = {UpdateDNS: [] , FailedDNSUpdate: []};

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    for (const domain of PurchasedDomains) {
        try {
            const sld = domain.split('.')[0];
            const tld = domain.substring(domain.indexOf('.') + 1);
        
            const DNSUpdateUrl = `${BaseUrl}?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.setHosts`
                + `&SLD=${sld}`
                + `&TLD=${tld}`
                + `&HostName1=@&RecordType1=MX&Address1=ASPMX.L.GOOGLE.COM.&MXPref1=1&TTL1=3600`
                + `&HostName2=@&RecordType2=MX&Address2=ALT1.ASPMX.L.GOOGLE.COM.&MXPref2=5&TTL2=3600`
                + `&HostName3=@&RecordType3=MX&Address3=ALT2.ASPMX.L.GOOGLE.COM.&MXPref3=5&TTL3=3600`
                + `&HostName4=@&RecordType4=MX&Address4=ALT3.ASPMX.L.GOOGLE.COM.&MXPref4=10&TTL4=3600`
                + `&HostName5=@&RecordType5=MX&Address5=ALT4.ASPMX.L.GOOGLE.COM.&MXPref5=10&TTL5=3600`;
        
            const DNSUpdateResponse = await axios.post(DNSUpdateUrl);
            const DNSUpdateResponseJson = await xml2js.parseStringPromise(DNSUpdateResponse.data, {
                explicitArray: false,
                attrkey: '$'
            });
        
            if (DNSUpdateResponseJson.ApiResponse.$.Status === 'OK') {
                console.log(`MX records set for ${domain}`);
                ConfigurationResults.UpdateDNS.push(domain);
            } else {
                console.error(`Failed to set MX records for ${domain}:`, DNSUpdateResponseJson.ApiResponse.Errors?.Error?._ || 'Unknown error');
                ConfigurationResults.FailedDNSUpdate.push({Domain: domain, Message: DNSUpdateResponseJson.ApiResponse.Errors?.Error?._ || 'Unknown error'});
            }
        } catch (dnsErr) {
            console.error(`Error setting DNS for ${domain}:`, dnsErr.message || 'Unknown error');
            ConfigurationResults.FailedDNSUpdate.push({Domain: domain, Message: dnsErr.message || 'Unknown error'});
        }
    }

    res.status(200).json({
        success: true,
        message: "DNS updated successfully",
        ConfigurationResults
    });
});

exports.GetDomainDNSDetails = catchAsyncError(async (req, res, next) => {
    const { Domain } = req.body;

    const sld = Domain.split('.')[0];
    const tld = Domain.substring(Domain.indexOf('.') + 1);

    const BaseUrl = process.env.NAMECHEAP_SANDBOX === 'true'
        ? 'https://api.sandbox.namecheap.com/xml.response'
        : 'https://api.namecheap.com/xml.response';

    const url = `${BaseUrl}/xml.response?ApiUser=${process.env.NAMECHEAP_API_USER}&ApiKey=${process.env.NAMECHEAP_API_KEY}&UserName=${process.env.NAMECHEAP_USERNAME}&ClientIp=${process.env.CLIENT_IP}&Command=namecheap.domains.dns.getHosts`
        + `&SLD=${sld}`
        + `&TLD=${tld}`;

    const responseXml = await axios.post(url);
    const responseJson = await xml2js.parseStringPromise(responseXml.data, { explicitArray: false, attrkey: '$' }); 
    
    if (responseJson.ApiResponse.$.Status === 'ERROR') {
        return next(new ErrorHandler(responseJson.ApiResponse.Errors.Error._, 400));
    }

    const dnsDetails = responseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;

    console.log(responseJson.ApiResponse.CommandResponse.DomainDNSGetHostsResult    );

    res.status(200).json({
        success: true,
        message: "DNS details retrieved successfully",
        dnsDetails
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
const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require('googleapis');
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const EmailAccountModel = require("../Model/emailAccountModel");

const { GmailOauth2Client, GmailScopes, MicrosoftEmailAccountDetails } = require("../Utils/emailAccountsUtils");
const { Client } = require("pg");
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
            Authorization: `sso-key ${process.env.GODADDY_API_KEY_OTE}:${process.env.GODADDY_API_SECRET_OTE}`
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
            Authorization: `sso-key ${process.env.GODADDY_API_KEY_OTE}:${process.env.GODADDY_API_SECRET_OTE}`,
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
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return next(new ErrorHandler("Please provide an array of domains", 400));
    }

    const results = [];
    let totalPrice = 0;

    for (let i = 0; i < domains.length; i++) {
        const domain = domains[i].trim().toLowerCase();
        const url = `${process.env.PORKBUN_API_URL}/api/json/v3/domain/checkDomain/${domain}`;

        const response = await axios.post(
            url,
            {
                secretapikey: process.env.PORKBUN_API_SECRET,
                apikey: process.env.PORKBUN_API_KEY
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        await new Promise(resolve => setTimeout(resolve, 10000));

        if (response.data.status !== 'SUCCESS') {
            console.error(`Error checking domain ${domain}: ${response.data.message}`);
            continue;
        }

        const result = response.data.response;

        const domainInfo = {
            domain,
            available: result.avail === 'yes',
            price: parseFloat(result.price) || 0,
            renewalPrice: parseFloat(result.regularPrice) || null,
            transferPrice: result.additional?.transfer ? parseFloat(result.additional.transfer.price) : null,
            isPremium: result.premium
        };

        if (domainInfo.available) {
            totalPrice += domainInfo.price;
        }

        results.push(domainInfo);
    }


    res.status(200).json({
        success: true,
        message: "Domain prices retrieved successfully",
        prices: results,
        totalPrice
    });
});

exports.CreatePaymentIntent = catchAsyncError(async (req, res, next) => {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || isNaN(amount)) {
        return next(new ErrorHandler("Invalid amount provided", 400));
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        payment_method_types: ["card"],
    });

    res.status(200).json({
        success: true,
        message: "Payment intent created successfully",
        clientSecret: paymentIntent.client_secret,
    });
});

exports.StripeWebhook = catchAsyncError(async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return next(new ErrorHandler(`Webhook signature verification failed: ${err.message}`, 400));
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent was successful! ID: ${paymentIntent.id}`);
        res.status(200).json({
            success: true,
            message: "Payment succeeded",
            paymentIntentId: paymentIntent.id
        });
    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent failed: ${paymentIntent.id}`);
        res.status(400).json({
            success: false,
            message: "Payment failed",
            paymentIntentId: paymentIntent.id
        });
    } else {
        console.log(`Unhandled event type: ${event.type}`);
        res.status(400).json({
            success: false,
            message: "Unhandled event occured",
            eventType: event.type
        });
    }
});

exports.BuyDomain = catchAsyncError(async (req, res, next) => {
    const { domain, tld, years, privacy, email, firstName, lastName } = req.body;

    if (!domain || !tld || !years || !privacy || !email || !firstName || !lastName) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    const url = `${process.env.GODADDY_API_URL}/v1/domains/purchase`;
    const data = {
        domain: `${domain}${tld}`,
        years,
        privacy,
        email,
        firstName,
        lastName
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `sso-key ${process.env.GODADDY_API_KEY_OTE}:${process.env.GODADDY_API_SECRET_OTE}`,
                'Content-Type': 'application/json',
            },
        });

        res.status(200).json({
            success: true,
            message: "Domain purchased successfully",
            response: response.data
        });
    } catch (error) {
        return next(new ErrorHandler(`Error purchasing domain: ${error.message}`, 500));
    }
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
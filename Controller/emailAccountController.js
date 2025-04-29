const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const { google } = require('googleapis');
const axios = require("axios");

const EmailAccountModel = require("../Model/emailAccountModel");

const { GmailOauth2Client, GmailScopes, MicrosoftEmailAccountDetails } = require("../Utils/emailAccountsUtils");
const { Client } = require("pg");
const { ClientId , ClientSecret, RedirectUri, OutlookScopes } = MicrosoftEmailAccountDetails;

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

exports.GetDomainSuggestions = catchAsyncError(async (req, res , next) => {
    const { domain , tlds , limit } = req.body;

    if (!domain || tlds.length === 0) {
        return next(new ErrorHandler("Domain and TLDs are required", 400));
    }

    const tldsList = tlds.map(tld => tld.replace(/\./g, '')).join(',');

    const url = `${process.env.GODADDY_API_URL}/v1/domains/suggest?query=${domain}&tlds=${tldsList}&limit=${limit || 10}&available=true`;
    console.log(url);

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

    try {
        const pricePromises = domains.map(async (domain) => {
            try {
                const response = await axios.get(`${process.env.GODADDY_API_URL}/v1/domains/available?domain=${domain}&checkType=FULL`, {
                    headers: {
                        Authorization: `sso-key ${process.env.GODADDY_API_KEY_OTE}:${process.env.GODADDY_API_SECRET_OTE}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                return {
                    domain,
                    available: response.data.available,
                    price: response.data.price/1000000 || 0,
                    currency: response.data.currency || 'USD',
                    isPremium: response.data.premium || false,
                    definitive: response.data.definitive
                };
            } catch (error) {
                console.error(`Error fetching price for domain ${domain}:`, error.message);
                return {
                    domain,
                    available: false,
                    error: error.message,
                    price: null
                };
            }
        });

        const priceResults = await Promise.all(pricePromises);
        const totalPrice = priceResults.reduce((total, domain) => {
            return domain.available ? total + domain.price : total;
        }, 0);

        res.status(200).json({
            success: true,
            message: "Domain prices retrieved successfully",
            prices: priceResults,
            totalPrice
        });
    } catch (error) {
        return next(new ErrorHandler(`Error retrieving domain prices: ${error.message}`, 500));
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

/* PART 2: hassle-free Email Setup | Gmail/Google Suite */

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
    
    const emailAccount = await EmailAccountModel.create({
        WorkspaceId: req.user.User.CurrentWorkspaceId,
        Email: data.email,
        Provider: "Google",
        RefreshToken: tokens.refresh_token,
        AccessToken: tokens.access_token,
        ExpiresIn: tokens.expiry_date,
    });
    
    if (!emailAccount) {
        return next(new ErrorHandler("Failed to create email account", 500));
    }
    
    res.status(200).json({
        success: true,
        message: "Gmail account connected successfully",
        emailAccount
    });
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
    
    const emailAccount = await EmailAccountModel.create({
        WorkspaceId: req.user.User.CurrentWorkspaceId,
        Email: userEmail,
        Provider: "Microsoft",
        RefreshToken: refresh_token,
        AccessToken: access_token,
        ExpiresIn: Date.now() + (expires_in * 1000),
    });
    
    if (!emailAccount) {
        return next(new ErrorHandler("Failed to create email account", 500));
    }
    
    res.status(200).json({
        success: true,
        message: "Microsoft account connected successfully",
        emailAccount
    });
});
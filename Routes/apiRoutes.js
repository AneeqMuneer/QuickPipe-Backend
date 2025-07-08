const express = require("express");
const { AddApi , CalendarAuthCheck } = require("../Controller/apiController");
const { VerifyUser } = require("../Middleware/userAuth");
const axios = require('axios');
const querystring = require('querystring');
const { chatWithGPT } = require('../Controller/aiController');

const router = express.Router();

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;
const HUBSPOT_SCOPE = process.env.HUBSPOT_SCOPE || 'crm.objects.contacts.read';

router.route("/AddApi").post(VerifyUser, AddApi);
router.route("/CalendarAuthCheck").get(VerifyUser, CalendarAuthCheck);
router.post('/chat', chatWithGPT);

// Static mapping for domain alternatives
const domainAlternatives = {
  "stripe.com": [
    { url: "https://paypal.com", name: "PayPal" },
    { url: "https://wise.com", name: "Wise" },
    { url: "https://jazzcash.com", name: "JazzCash" },
    { url: "https://easypaisa.com", name: "EasyPaisa" },
    { url: "https://squareup.com", name: "Square" }
  ],
  "paypal.com": [
    { url: "https://stripe.com", name: "Stripe" },
    { url: "https://wise.com", name: "Wise" },
    { url: "https://skrill.com", name: "Skrill" },
    { url: "https://payoneer.com", name: "Payoneer" },
    { url: "https://venmo.com", name: "Venmo" }
  ],
  "wise.com": [
    { url: "https://stripe.com", name: "Stripe" },
    { url: "https://paypal.com", name: "PayPal" },
    { url: "https://payoneer.com", name: "Payoneer" },
    { url: "https://remitly.com", name: "Remitly" },
    { url: "https://revolut.com", name: "Revolut" }
  ],
  "skrill.com": [
    { url: "https://paypal.com", name: "PayPal" },
    { url: "https://neteller.com", name: "Neteller" },
    { url: "https://payoneer.com", name: "Payoneer" },
    { url: "https://wise.com", name: "Wise" }
  ],
  "payoneer.com": [
    { url: "https://paypal.com", name: "PayPal" },
    { url: "https://stripe.com", name: "Stripe" },
    { url: "https://wise.com", name: "Wise" },
    { url: "https://skrill.com", name: "Skrill" }
  ],
  "venmo.com": [
    { url: "https://paypal.com", name: "PayPal" },
    { url: "https://cash.app", name: "Cash App" },
    { url: "https://zellepay.com", name: "Zelle" },
    { url: "https://google.com/pay", name: "Google Pay" }
  ],
  "github.com": [
    { url: "https://gitlab.com", name: "GitLab" },
    { url: "https://bitbucket.org", name: "Bitbucket" },
    { url: "https://sourceforge.net", name: "SourceForge" },
    { url: "https://azure.microsoft.com/en-us/services/devops/repos/", name: "Azure Repos" }
  ],
  "gitlab.com": [
    { url: "https://github.com", name: "GitHub" },
    { url: "https://bitbucket.org", name: "Bitbucket" },
    { url: "https://sourceforge.net", name: "SourceForge" },
    { url: "https://gitea.io", name: "Gitea" }
  ],
  "bitbucket.org": [
    { url: "https://github.com", name: "GitHub" },
    { url: "https://gitlab.com", name: "GitLab" },
    { url: "https://sourceforge.net", name: "SourceForge" },
    { url: "https://gitea.io", name: "Gitea" }
  ],
  "dropbox.com": [
    { url: "https://drive.google.com", name: "Google Drive" },
    { url: "https://onedrive.live.com", name: "OneDrive" },
    { url: "https://box.com", name: "Box" },
    { url: "https://icloud.com", name: "iCloud" },
    { url: "https://mega.nz", name: "MEGA" }
  ],
  "drive.google.com": [
    { url: "https://dropbox.com", name: "Dropbox" },
    { url: "https://onedrive.live.com", name: "OneDrive" },
    { url: "https://box.com", name: "Box" },
    { url: "https://icloud.com", name: "iCloud" }
  ],
  "onedrive.live.com": [
    { url: "https://dropbox.com", name: "Dropbox" },
    { url: "https://drive.google.com", name: "Google Drive" },
    { url: "https://box.com", name: "Box" },
    { url: "https://icloud.com", name: "iCloud" }
  ],
  "box.com": [
    { url: "https://dropbox.com", name: "Dropbox" },
    { url: "https://drive.google.com", name: "Google Drive" },
    { url: "https://onedrive.live.com", name: "OneDrive" },
    { url: "https://icloud.com", name: "iCloud" }
  ],
  "icloud.com": [
    { url: "https://dropbox.com", name: "Dropbox" },
    { url: "https://drive.google.com", name: "Google Drive" },
    { url: "https://onedrive.live.com", name: "OneDrive" },
    { url: "https://box.com", name: "Box" }
  ],
  "mega.nz": [
    { url: "https://dropbox.com", name: "Dropbox" },
    { url: "https://drive.google.com", name: "Google Drive" },
    { url: "https://onedrive.live.com", name: "OneDrive" },
    { url: "https://box.com", name: "Box" }
  ],
  "slack.com": [
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://discord.com", name: "Discord" },
    { url: "https://mattermost.com", name: "Mattermost" },
    { url: "https://rocket.chat", name: "Rocket.Chat" },
    { url: "https://chanty.com", name: "Chanty" }
  ],
  "discord.com": [
    { url: "https://slack.com", name: "Slack" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://mattermost.com", name: "Mattermost" },
    { url: "https://rocket.chat", name: "Rocket.Chat" }
  ],
  "teams.microsoft.com": [
    { url: "https://slack.com", name: "Slack" },
    { url: "https://discord.com", name: "Discord" },
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://webex.com", name: "Cisco Webex" }
  ],
  "zoom.us": [
    { url: "https://meet.google.com", name: "Google Meet" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://webex.com", name: "Cisco Webex" },
    { url: "https://gotomeeting.com", name: "GoToMeeting" },
    { url: "https://bluejeans.com", name: "BlueJeans" }
  ],
  "meet.google.com": [
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://webex.com", name: "Cisco Webex" },
    { url: "https://gotomeeting.com", name: "GoToMeeting" }
  ],
  "webex.com": [
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://meet.google.com", name: "Google Meet" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://gotomeeting.com", name: "GoToMeeting" }
  ],
  "gotomeeting.com": [
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://meet.google.com", name: "Google Meet" },
    { url: "https://webex.com", name: "Cisco Webex" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" }
  ],
  "bluejeans.com": [
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://webex.com", name: "Cisco Webex" },
    { url: "https://meet.google.com", name: "Google Meet" }
  ],
  "shopify.com": [
    { url: "https://woocommerce.com", name: "WooCommerce" },
    { url: "https://bigcommerce.com", name: "BigCommerce" },
    { url: "https://magento.com", name: "Magento" },
    { url: "https://wix.com", name: "Wix eCommerce" },
    { url: "https://squarespace.com", name: "Squarespace" }
  ],
  "woocommerce.com": [
    { url: "https://shopify.com", name: "Shopify" },
    { url: "https://bigcommerce.com", name: "BigCommerce" },
    { url: "https://magento.com", name: "Magento" },
    { url: "https://wix.com", name: "Wix eCommerce" }
  ],
  "bigcommerce.com": [
    { url: "https://shopify.com", name: "Shopify" },
    { url: "https://woocommerce.com", name: "WooCommerce" },
    { url: "https://magento.com", name: "Magento" },
    { url: "https://wix.com", name: "Wix eCommerce" }
  ],
  "magento.com": [
    { url: "https://shopify.com", name: "Shopify" },
    { url: "https://woocommerce.com", name: "WooCommerce" },
    { url: "https://bigcommerce.com", name: "BigCommerce" },
    { url: "https://wix.com", name: "Wix eCommerce" }
  ],
  "wix.com": [
    { url: "https://shopify.com", name: "Shopify" },
    { url: "https://woocommerce.com", name: "WooCommerce" },
    { url: "https://bigcommerce.com", name: "BigCommerce" },
    { url: "https://magento.com", name: "Magento" }
  ],
  "squarespace.com": [
    { url: "https://shopify.com", name: "Shopify" },
    { url: "https://woocommerce.com", name: "WooCommerce" },
    { url: "https://bigcommerce.com", name: "BigCommerce" },
    { url: "https://magento.com", name: "Magento" }
  ],
  "mailchimp.com": [
    { url: "https://sendinblue.com", name: "Brevo (Sendinblue)" },
    { url: "https://convertkit.com", name: "ConvertKit" },
    { url: "https://getresponse.com", name: "GetResponse" },
    { url: "https://constantcontact.com", name: "Constant Contact" },
    { url: "https://mailerlite.com", name: "MailerLite" }
  ],
  "sendinblue.com": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://convertkit.com", name: "ConvertKit" },
    { url: "https://getresponse.com", name: "GetResponse" },
    { url: "https://constantcontact.com", name: "Constant Contact" }
  ],
  "convertkit.com": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://sendinblue.com", name: "Brevo (Sendinblue)" },
    { url: "https://getresponse.com", name: "GetResponse" },
    { url: "https://constantcontact.com", name: "Constant Contact" }
  ],
  "getresponse.com": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://sendinblue.com", name: "Brevo (Sendinblue)" },
    { url: "https://convertkit.com", name: "ConvertKit" },
    { url: "https://constantcontact.com", name: "Constant Contact" }
  ],
  "constantcontact.com": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://sendinblue.com", name: "Brevo (Sendinblue)" },
    { url: "https://convertkit.com", name: "ConvertKit" },
    { url: "https://getresponse.com", name: "GetResponse" }
  ],
  "mailerlite.com": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://sendinblue.com", name: "Brevo (Sendinblue)" },
    { url: "https://convertkit.com", name: "ConvertKit" },
    { url: "https://getresponse.com", name: "GetResponse" }
  ],
  "salesforce.com": [
    { url: "https://hubspot.com", name: "HubSpot CRM" },
    { url: "https://zoho.com/crm", name: "Zoho CRM" },
    { url: "https://pipedrive.com", name: "Pipedrive" },
    { url: "https://freshworks.com/crm", name: "Freshsales" },
    { url: "https://insightly.com", name: "Insightly" }
  ],
  "hubspot.com": [
    { url: "https://salesforce.com", name: "Salesforce" },
    { url: "https://zoho.com/crm", name: "Zoho CRM" },
    { url: "https://pipedrive.com", name: "Pipedrive" },
    { url: "https://freshworks.com/crm", name: "Freshsales" }
  ],
  "zoho.com/crm": [
    { url: "https://salesforce.com", name: "Salesforce" },
    { url: "https://hubspot.com", name: "HubSpot CRM" },
    { url: "https://pipedrive.com", name: "Pipedrive" },
    { url: "https://freshworks.com/crm", name: "Freshsales" }
  ],
  "pipedrive.com": [
    { url: "https://salesforce.com", name: "Salesforce" },
    { url: "https://hubspot.com", name: "HubSpot CRM" },
    { url: "https://zoho.com/crm", name: "Zoho CRM" },
    { url: "https://freshworks.com/crm", name: "Freshsales" }
  ],
  "freshworks.com/crm": [
    { url: "https://salesforce.com", name: "Salesforce" },
    { url: "https://hubspot.com", name: "HubSpot CRM" },
    { url: "https://zoho.com/crm", name: "Zoho CRM" },
    { url: "https://pipedrive.com", name: "Pipedrive" }
  ],
  "insightly.com": [
    { url: "https://salesforce.com", name: "Salesforce" },
    { url: "https://hubspot.com", name: "HubSpot CRM" },
    { url: "https://zoho.com/crm", name: "Zoho CRM" },
    { url: "https://pipedrive.com", name: "Pipedrive" }
  ],
  "trello.com": [
    { url: "https://asana.com", name: "Asana" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "asana.com": [
    { url: "https://trello.com", name: "Trello" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "clickup.com": [
    { url: "https://asana.com", name: "Asana" },
    { url: "https://trello.com", name: "Trello" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "monday.com": [
    { url: "https://asana.com", name: "Asana" },
    { url: "https://trello.com", name: "Trello" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "notion.so": [
    { url: "https://coda.io", name: "Coda" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://asana.com", name: "Asana" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "coda.io": [
    { url: "https://notion.so", name: "Notion" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://asana.com", name: "Asana" },
    { url: "https://monday.com", name: "Monday.com" }
  ],
  "jira.com": [
    { url: "https://asana.com", name: "Asana" },
    { url: "https://trello.com", name: "Trello" },
    { url: "https://clickup.com", name: "ClickUp" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://notion.so", name: "Notion" }
  ],
  "airtable.com": [
    { url: "https://smartsheet.com", name: "Smartsheet" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://coda.io", name: "Coda" },
    { url: "https://monday.com", name: "Monday.com" },
    { url: "https://jira.com", name: "Jira" }
  ],
  "smartsheet.com": [
    { url: "https://airtable.com", name: "Airtable" },
    { url: "https://notion.so", name: "Notion" },
    { url: "https://coda.io", name: "Coda" },
    { url: "https://monday.com", name: "Monday.com" }
  ],
  // Design & Creative
  "canva.com": [
    { url: "https://adobe.com/express", name: "Adobe Express" },
    { url: "https://crello.com", name: "VistaCreate (Crello)" },
    { url: "https://picmonkey.com", name: "PicMonkey" },
    { url: "https://snappa.com", name: "Snappa" }
  ],
  "figma.com": [
    { url: "https://adobe.com/products/xd.html", name: "Adobe XD" },
    { url: "https://sketch.com", name: "Sketch" },
    { url: "https://invisionapp.com", name: "InVision" },
    { url: "https://framer.com", name: "Framer" }
  ],
  "adobe.com/express": [
    { url: "https://canva.com", name: "Canva" },
    { url: "https://crello.com", name: "VistaCreate (Crello)" },
    { url: "https://picmonkey.com", name: "PicMonkey" },
    { url: "https://snappa.com", name: "Snappa" }
  ],
  // Video Conferencing
  "skype.com": [
    { url: "https://zoom.us", name: "Zoom" },
    { url: "https://meet.google.com", name: "Google Meet" },
    { url: "https://teams.microsoft.com", name: "Microsoft Teams" },
    { url: "https://webex.com", name: "Cisco Webex" }
  ],
  // Marketing Automation
  "hubspot.com/marketing": [
    { url: "https://mailchimp.com", name: "Mailchimp" },
    { url: "https://activecampaign.com", name: "ActiveCampaign" },
    { url: "https://getresponse.com", name: "GetResponse" },
    { url: "https://constantcontact.com", name: "Constant Contact" }
  ],
  // E-signature
  "docusign.com": [
    { url: "https://hellosign.com", name: "HelloSign" },
    { url: "https://adobesign.com", name: "Adobe Sign" },
    { url: "https://signnow.com", name: "SignNow" },
    { url: "https://pandadoc.com", name: "PandaDoc" }
  ],
  // Cloud Hosting
  "aws.amazon.com": [
    { url: "https://azure.microsoft.com", name: "Microsoft Azure" },
    { url: "https://cloud.google.com", name: "Google Cloud" },
    { url: "https://digitalocean.com", name: "DigitalOcean" },
    { url: "https://heroku.com", name: "Heroku" }
  ],
  "azure.microsoft.com": [
    { url: "https://aws.amazon.com", name: "AWS" },
    { url: "https://cloud.google.com", name: "Google Cloud" },
    { url: "https://digitalocean.com", name: "DigitalOcean" },
    { url: "https://heroku.com", name: "Heroku" }
  ],
  "cloud.google.com": [
    { url: "https://aws.amazon.com", name: "AWS" },
    { url: "https://azure.microsoft.com", name: "Microsoft Azure" },
    { url: "https://digitalocean.com", name: "DigitalOcean" },
    { url: "https://heroku.com", name: "Heroku" }
  ],
  // Social Media Management
  "buffer.com": [
    { url: "https://hootsuite.com", name: "Hootsuite" },
    { url: "https://sproutsocial.com", name: "Sprout Social" },
    { url: "https://later.com", name: "Later" },
    { url: "https://zoho.com/social", name: "Zoho Social" }
  ],
  // Analytics
  "analytics.google.com": [
    { url: "https://mixpanel.com", name: "Mixpanel" },
    { url: "https://amplitude.com", name: "Amplitude" },
    { url: "https://heap.io", name: "Heap" },
    { url: "https://matomo.org", name: "Matomo" }
  ],
  // Regional/Local
  "yandex.ru": [
    { url: "https://google.com", name: "Google" },
    { url: "https://bing.com", name: "Bing" },
    { url: "https://duckduckgo.com", name: "DuckDuckGo" },
    { url: "https://baidu.com", name: "Baidu" }
  ],
  "baidu.com": [
    { url: "https://google.com", name: "Google" },
    { url: "https://bing.com", name: "Bing" },
    { url: "https://duckduckgo.com", name: "DuckDuckGo" },
    { url: "https://yandex.ru", name: "Yandex" }
  ],
  // Add more as needed
};

router.get('/gotalt-alternatives', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });
  const key = domain.toLowerCase();
  if (domainAlternatives[key]) {
    res.json({ alternatives: domainAlternatives[key] });
  } else {
    res.json({ alternatives: [], message: 'No alternatives found for this domain.' });
  }
});

// Step 1: Redirect user to HubSpot OAuth
router.get('/auth/hubspot', (req, res) => {
  const params = querystring.stringify({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: HUBSPOT_REDIRECT_URI,
    scope: HUBSPOT_SCOPE,
    response_type: 'code',
  });
  res.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

// Step 2: Handle OAuth callback
router.get('/auth/hubspot/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');
  // Exchange code for access token
  try {
    const response = await axios.post('https://api.hubapi.com/oauth/v1/token', querystring.stringify({
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    // Save tokens to DB or session as needed
    // For demo, just send them back
    res.json(response.data);
  } catch (err) {
    console.error('HubSpot token exchange error:', err.response ? err.response.data : err.message);
    res.status(500).send('Token exchange failed: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
});

module.exports = router;
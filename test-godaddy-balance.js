// Test script for checking GoDaddy account balance
require('dotenv').config({ path: './config/config.env' });
const axios = require('axios');

async function checkGoDaddyBalance() {
    try {
        console.log('Checking GoDaddy account balance...');

        // Check if API keys are available
        const apiKey = process.env.GODADDY_API_KEY;
        const apiSecret = process.env.GODADDY_API_SECRET;

        console.log('API Key:', apiKey ? '✓ Found' : '✗ Missing');
        console.log('API Secret:', apiSecret ? '✓ Found' : '✗ Missing');
        console.log('API URL:', process.env.GODADDY_API_URL || 'Not set (will use default)');

        if (!apiKey || !apiSecret) {
            console.error('❌ API keys are missing. Check your config.env file.');
            return;
        }

        // Format the authorization header
        const authHeader = `sso-key ${apiKey}:${apiSecret}`;

        // Step 1: Get shopper info
        const shopperUrl = `${process.env.GODADDY_API_URL || 'https://api.godaddy.com'}/v1/shoppers/${process.env.GODADDY_SHOPPER_ID}`;
        console.log('\nFetching shopper info from:', shopperUrl);

        const shopperResponse = await axios.get(shopperUrl, {
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        });

        console.log('\nShopper Info:');
        console.log('- Shopper ID:', shopperResponse.data.shopperId);
        console.log('- Name:', `${shopperResponse.data.nameFirst} ${shopperResponse.data.nameLast}`);
        console.log('- Email:', shopperResponse.data.email);

        // Step 2: Get balance info
        const shopperId = shopperResponse.data.shopperId;
        const balanceUrl = `${process.env.GODADDY_API_URL || 'https://api.godaddy.com'}/v1/shoppers/${shopperId}/balance`;
        console.log('\nFetching balance info from:', balanceUrl);

        const balanceResponse = await axios.get(balanceUrl, {
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        });

        console.log('\nBalance Info:');
        console.log(JSON.stringify(balanceResponse.data, null, 2));

        console.log('\n✅ Success! Your GoDaddy account balance is:', balanceResponse.data.accountBalance);

    } catch (error) {
        console.error('\n❌ Error checking GoDaddy balance:');

        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);

            if (error.response.status === 401) {
                console.error('\n⚠️ Authentication failed. Your API keys may be incorrect or expired.');
            } else if (error.response.status === 403) {
                console.error('\n⚠️ Access forbidden. Your API key may not have sufficient permissions.');
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received. Check your network connection or API URL.');
        } else {
            // Something happened in setting up the request
            console.error('Error message:', error.message);
        }
    }
}

// Run the check
checkGoDaddyBalance(); 
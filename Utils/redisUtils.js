const { createClient } = require('redis');
const axios = require('axios');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (error) {
        console.error('Redis connection error:', error);
    }
};

const setAccessToken = async (accessToken, expiresIn) => {
    try {
        await redisClient.set(`access_token`, accessToken, {
            EX: expiresIn
        });
    } catch (error) {
        console.error('Error setting access token:', error);
    }
};

const getAccessToken = async () => {
    try {
        let token = await redisClient.get('access_token');

        if (!token) {
            console.log('Access token missing or expired. Refreshing...');

            const tokenResponse = await axios.post(
                `https://accounts.zoho.com/oauth/v2/token`,
                new URLSearchParams({
                    client_id: process.env.ZOHO_CLIENT_ID,
                    client_secret: process.env.ZOHO_CLIENT_SECRET,
                    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                    grant_type: 'refresh_token',
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const { access_token, expires_in } = tokenResponse.data;

            await setAccessToken(access_token, expires_in);
            token = access_token;

            console.log('New access token saved.');
        }

        return token;
    } catch (error) {
        console.error('Error getting or refreshing access token:', error.response?.data || error.message);
        throw new Error('Failed to get Zoho access token');
    }
};

module.exports = {
    connectRedis,
    setAccessToken,
    getAccessToken,
}; 
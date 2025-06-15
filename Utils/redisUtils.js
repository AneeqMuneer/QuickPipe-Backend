const { createClient } = require('redis');

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
        return await redisClient.get(`access_token`);
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
};

module.exports = {
    connectRedis,
    setAccessToken,
    getAccessToken
}; 
const TokenCreation = (User, statusCode, res) => {
    const token = User.getJWTToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    
    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        User,
        token,
    });
};

module.exports = TokenCreation;
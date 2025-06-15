const asyncError = require("../Middleware/asyncError.js");
const ErrorHandler = require("../Utils/errorHandler");
const jwt = require("jsonwebtoken");
const UserModel = require("../Model/userModel.js");
const dotenv = require("dotenv");

dotenv.config({ path: "./config/config.env" });

exports.VerifyUser = asyncError(async (req, res, next) => {
    if (!req.header("Authorization")) {
        return next(
            new ErrorHandler("Please login to access this resource", 401)
        );
    }

    let token = req.header("Authorization").replace("Bearer ", "");

    if (!token) {
        return next(
            new ErrorHandler("Please login to access this resource", 401)
        );
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    const member = await UserModel.findByPk(decodedData.id);

    if (member) {
        req.user = {
            User: member,
        };
        next();
    } else {
        return next(
            new ErrorHandler(
                "Invalid Token Kindly Login Again Or Enter Correct Credentials",
                401
            )
        );
    }
});
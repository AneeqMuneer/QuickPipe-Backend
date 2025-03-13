const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const TokenCreation = require("../Utils/tokenCreation");
const { Op } = require("sequelize");

const UserModel = require("../Model/userModel");

exports.UserSignup = catchAsyncError(async (req , res , next) => {
    const { FirstName , LastName , Email , PhoneNumber , Password } = req.body;

    if (!FirstName || !LastName || !Email || !Password || !PhoneNumber) {
        return next(new ErrorHandler("Please fill the required fields" , 400));
    }

    const User = await UserModel.create({
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        Password
    });

    res.status(201).json({
        success: true,
        message: "User created successfully",
        User
    });
});

exports.Login = catchAsyncError(async (req , res , next) => {
    const { Email , Password } = req.body;

    if (!Email || !Password) {
        return next(new ErrorHandler("Please enter Email and Password.", 400));
    }

    const User = await UserModel.findOne({
        where: { Email }
    });

    if (!User) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }

    const isPasswordMatched = await User.comparePassword(Password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }
    
    TokenCreation(User, 201, res);
});


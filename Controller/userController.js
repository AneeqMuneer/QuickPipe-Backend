const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const TokenCreation = require("../Utils/tokenCreation");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const UserModel = require("../Model/userModel");
const WorkspaceModel = require("../Model/workspaceModel");
const APIModel = require("../Model/apiModel");

const { SendAuthCodeMail, SendForgetPasswordMail } = require("../Utils/userUtils");

exports.Signup = catchAsyncError(async (req, res, next) => {
    const { FirstName, LastName, Email, PhoneNumber, Password } = req.body;

    if (!FirstName || !LastName || !Email || !Password || !PhoneNumber) {
        return next(new ErrorHandler("Please fill the required fields", 400));
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(Password)) {
        return next(new ErrorHandler("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." , 400));
    }

    const User = await UserModel.create({
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        Password
    });

    const Workspace = await WorkspaceModel.create({
        OwnerId: User.id,
        WorkspaceName: `${User.FirstName}'s Workspace`
    });

    const API = await APIModel.create({
        WorkspaceId: Workspace.id
    });

    User.CurrentWorkspaceId = Workspace.id;
    await User.save();

    res.status(201).json({
        success: true,
        message: "User created successfully",
        User,
        Workspace,
        API
    });
});

exports.Login = catchAsyncError(async (req, res, next) => {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        return next(new ErrorHandler("Please enter Email and Password.", 400));
    }

    const User = await UserModel.findOne({
        where: {
            Email: Email.toLowerCase()
        }
    });
    
    if (!User) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }
    
    const isPasswordMatched = await User.comparePassword(Password);
    
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }
    
    if (User.TFA) {
        req.user = {};
        req.user.User = User;
        return next();
    }

    TokenCreation(User, 201, res);
});

exports.TwoFactorAuthentication = catchAsyncError(async (req, res, next) => {
    const User = req.user.User;

    if (!User) {
        return next(new ErrorHandler("User not found." , 400));
    }
    
    const code = await User.getAuthCode();
    await SendAuthCodeMail(User.Email, code);
    res.status(200).json({
        success: true,
        message: "Auth code sent to user via email successfully.",
        User
    });
});

exports.VerifyCode = catchAsyncError(async (req, res, next) => {
    const { UserCode , Login } = req.body;

    if (!UserCode) {
        return next(new ErrorHandler("Enter the required fields", 401));
    }

    const User = await UserModel.findOne({
        where: {
            TFACode: UserCode
        }
    });

    if (!User) {
        return next(new ErrorHandler("Invalid Code", 401));
    }

    if (!User.IsCodeValid()) {
        return next(new ErrorHandler("The code has expired. Please try again.", 400));
    }

    if (Login) {
        TokenCreation(User, 201, res);
    } else {
        res.status(200).json({
            success: true,
            message: "Code verified successfully",
        });
    }
});

exports.ForgetPassword = catchAsyncError(async (req , res , next) => {
    const { Email } = req.body;

    if (!Email) {
        return next(new ErrorHandler("Please enter the required fields." , 400));
    }

    const User = await UserModel.findOne({
        where: {
            Email
        }
    });

    if(!User) {
        return next(new ErrorHandler("User with this email doesn't exist" , 400));
    }

    const token = User.getJWTToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    
    await SendForgetPasswordMail(Email , token);

    User.ResetActive = true;
    await User.save();
    
    res.status(201).cookie("token", token, options).json({
        success: true,
        message: "Password reset mail sent to user via mail"
    });
});

exports.ResetPassword = catchAsyncError(async (req , res , next) => {
    let { token } = req.query;
    const DecodedData = jwt.verify(token, process.env.JWT_SECRET);

    const User = await UserModel.findOne({
        where: {
            id: DecodedData.id
        }
    });

    if (!User) {
        return next(new ErrorHandler("User not found"))
    }

    if (!User.ResetActive) {
        return next(new ErrorHandler("This URL is invalid" , 400));
    }

    const { NewPassword } = req.body;

    if (!NewPassword) {
        return next(new ErrorHandler("Please provide a new password", 400));
    }

    const isPasswordMatched = await User.comparePassword(NewPassword);

    if (isPasswordMatched) {
        return next(new ErrorHandler("New password cannot be same as the last one", 400));
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(NewPassword)) {
        return next(new ErrorHandler("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." , 400));
    }

    User.Password = await bcrypt.hash(NewPassword, 10);
    User.ResetActive = false;
    await User.save();
    
    res.status(200).json({
        success: true,
        message: "Password resetted successfully"
    });
});

exports.VerifyOldPassword = catchAsyncError(async (req , res , next) => {
    const { OldPassword } = req.body;
    const id = req.user.User.id;

    if (!OldPassword || !id) {
        return next(new ErrorHandler("Please provide the required details", 400));
    }
    
    const User = await UserModel.findByPk(id);
    
    if (!User) {
        return next(new ErrorHandler("User not found", 404));
    }

    const isPasswordMatched = await User.comparePassword(OldPassword);
    
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Entered Password is incorrect", 400));
    }

    req.body.User = User;

    return next();
});

exports.UpdatePassword = catchAsyncError(async (req , res , next) => {
    const { User , OldPassword , NewPassword , RetypePassword } = req.body;
    
    if (!User) {
        return next(new ErrorHandler("User not found", 400));
    }
    
    if (!NewPassword || !RetypePassword) {
        return next(new ErrorHandler("Please provide a new password", 400));
    }

    if (NewPassword !== RetypePassword) {
        return next(new ErrorHandler("The passwords don't match" , 400));
    }

    if (OldPassword === NewPassword) {
        return next(new ErrorHandler("New password cannot be same as the last one" , 400));
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(NewPassword)) {
        return next(new ErrorHandler("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." , 400));
    }
    
    User.Password = await bcrypt.hash(NewPassword, 10);
    await User.save();
    
    res.status(200).json({
        success: true,
        message: "Password updated successfully"
    });
});

exports.GetUserDetails = catchAsyncError(async (req , res , next) => {
    const Id = req.user.User.id;

    if (!Id) {
        return next(new ErrorHandler("User not found" , 400));
    }

    const User = await UserModel.findByPk(Id);

    if (!User) {
        return next(new ErrorHandler("User doesn't exist" , 400));
    }

    res.status(200).json({
        success: true,
        message: "User found successfully",
        User
    });
});

exports.UpdateUserDetails = catchAsyncError(async (req , res , next) => {
    const { FirstName , LastName , Email , PhoneNumber } = req.body;
    const Id = req.user.User.id;
    
    const User = await UserModel.findByPk(Id);

    if (!User) {
        return next(new ErrorHandler("User doesn't exist", 400));
    }

    User.FirstName = FirstName || User.FirstName;
    User.LastName = LastName || User.LastName;
    User.Email = Email || User.Email;
    User.PhoneNumber = PhoneNumber || User.PhoneNumber;

    await User.save();

    res.status(200).json({
        success: true,
        message: "User data updated successfully",
        User
    });
});

exports.SwitchTFA = catchAsyncError(async (req , res , next) => {
    const Id = req.user.User.id;

    const User = await UserModel.findByPk(Id);

    if (!User) {
        return next(new ErrorHandler("User not found", 400));
    }

    User.TFA = !User.TFA;
    await User.save();

    res.status(200).json({
        success: true,
        message: "TFA switched successfully",
        User
    });
});
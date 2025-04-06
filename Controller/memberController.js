const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const TokenCreation = require("../Utils/tokenCreation");
const { Op } = require("sequelize");

const { SendInviteMail } = require("../Utils/memberUtils");

const UserModel = require("../Model/userModel");
const WorkspaceModel = require("../Model/workspaceModel");
const MemberModel = require("../Model/memberModel");

exports.AddMember = catchAsyncError(async (req , res , next) => {
    const { Email , Role } = req.body;
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    if (!Email || !Role) {
        return next(new ErrorHandler("Please enter the required fields" , 400));
    }

    const User = await UserModel.findOne({
        where: {
            Email: Email.toLowerCase()
        }
    });

    if (!User) {
        return next(new ErrorHandler("User doesn't exist" , 400));
    }

    const Workspace = await WorkspaceModel.findOne({
        where: {
            id: WorkspaceId,
            OwnerId: req.user.User.id
        }
    });

    if (!Workspace) {
        return next(new ErrorHandler("Either the workspace doesn't exist or you don't own the workspace" , 400));
    }

    const Invite = await MemberModel.findOne({
        where: {
            UserId: User.id,
            WorkspaceId: Workspace.id
        } 
    });

    if (Invite) {
        if (Invite.IsInvite) {
            return next(new ErrorHandler("Invite already sent to this user" , 400));
        } else {
            return next(new ErrorHandler("User is already a member of this workspace" , 400));
        }
    }

    const Member = await MemberModel.create({
        UserId: User.id,
        WorkspaceId,
        Role,
    });

    await SendInviteMail(User , Workspace);

    res.status(200).json({
        success: true,
        message: "Invite link sent to user successfully",
        Member
    });
});

exports.GetWorkspaceMembers = catchAsyncError(async (req , res , next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const WorkspaceMembers = await MemberModel.findAll({
        where: {
            WorkspaceId
        }
    });

    const Members = WorkspaceMembers.filter(member => !member.IsInvite);
    const Invites = WorkspaceMembers.filter(member => member.IsInvite);

    for (let i = 0; i < Members.length; i++) {
        const user = await UserModel.findByPk(Members[i].UserId);
        Members[i].dataValues.FullName = user.FirstName + " " + user.LastName;
    }

    for (let i = 0; i < Invites.length; i++) {
        const user = await UserModel.findByPk(Invites[i].UserId);
        Invites[i].dataValues.FullName = user.FirstName + " " + user.LastName;
    }

    res.status(200).json({
        success: true,
        message: "Members fetched successfully",
        count: Members.length + Invites.length,
        Members,
        Invites
    });
});

exports.VerifyInvitation = catchAsyncError(async (req , res , next) => {
    const { wkid , usid } = req.params;

    const Member = await MemberModel.findOne({
        where: {
            UserId: usid,
            WorkspaceId: wkid
        } 
    });

    if (!Member) {
        return next(new ErrorHandler("Invite not found" , 400));
    }

    const User = await UserModel.findByPk(usid);

    if (!User) {
        return next(new ErrorHandler("User not found" , 400));
    }

    const Workspace = await WorkspaceModel.findByPk(wkid);

    if (!Workspace) {
        return next(new ErrorHandler("Workspace not found" , 400));
    }

    res.status(200).json({
        success: true,
        message: "Invite link is valid",
        Role: Member.Role,
        Username: User.FirstName + " " + User.LastName,
        WorkspaceName: Workspace.WorkspaceName,
    });
});

exports.AcceptInvitation = catchAsyncError(async (req , res , next) => {
    const { wkid , usid } = req.body;

    const Member = await MemberModel.findOne({
        where: {
            UserId: usid,
            WorkspaceId: wkid
        }
    });

    if (!Member) {
        return next(new ErrorHandler("Invite not found" , 400));
    }

    if (!Member.IsInviteValid()) {
        return next(new ErrorHandler("Invite link has been expired" , 400));
    }

    Member.IsInvite = false;
    Member.InviteExpiration = null;
    await Member.save();

    const User = await UserModel.findByPk(usid);
    User.CurrentWorkspaceId = wkid;
    await User.save();

    res.status(200).json({
        success: true,
        message: "Invite accepted",
    });
});

exports.RejectInvitation = catchAsyncError(async (req , res , next) => {
    const { wkid , usid } = req.body;

    const Member = await MemberModel.findOne({
        where: {
            UserId: usid,
            WorkspaceId: wkid
        } 
    });

    if (!Member) {
        return next(new ErrorHandler("Invite not found" , 400));
    }

    if (!Member.IsInviteValid()) {
        return next(new ErrorHandler("Invite link has been expired" , 400));
    }

    await Member.destroy();

    res.status(200).json({
        success: true,
        message: "Invite rejected",
    });
});
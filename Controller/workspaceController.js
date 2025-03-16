const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const TokenCreation = require("../Utils/tokenCreation");
const { Op } = require("sequelize");

const UserModel = require("../Model/userModel");
const WorkspaceModel = require("../Model/workspaceModel");
const MemberModel = require("../Model/memberModel");

exports.CreateWorkspace = catchAsyncError(async (req , res , next) => {
    const { WorkspaceName } = req.body;
    const Id = req.user.User.id;

    if (!WorkspaceName) {
        return next(new ErrorHandler("Please fill the required details" , 400));
    }

    const Workspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id,
            WorkspaceName
        }
    });

    if (Workspaces.length > 0) {
        return next(new ErrorHandler("A workspace with this name already exists." , 400));
    }

    const Workspace = await WorkspaceModel.create({
        WorkspaceName,
        OwnerId: Id
    });

    res.status(201).json({
        success: true,
        message: "Workspace created successfully",
        Workspace
    });
});

exports.UpdateWorkspace = catchAsyncError(async (req , res , next) => {
    const { WorkspaceName } = req.body;
    const WorkspaceId = req.user.User.CurrentWorkspaceId;
    const Id = req.user.User.id;

    if (!WorkspaceName) {
        return next(new ErrorHandler("Please fill the required details" , 400));
    }

    const Workspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id,
            WorkspaceName
        }
    });

    if (Workspaces.length > 0) {
        return next(new ErrorHandler("A workspace with this name already exists." , 400));
    }

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    Workspace.WorkspaceName = WorkspaceName;
    await Workspace.save();

    res.status(200).json({
        success: true,
        message: "Workspace updated successfully",
        Workspace
    });
});

exports.GetCurrentWorkspace = catchAsyncError(async (req , res , next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    res.status(201).json({
        success: true,
        message: "Current workspace created successfully",
        Workspace
    });
});

exports.GetAllUserWorkspace = catchAsyncError(async (req , res , next) => {
    const Id = req.user.User.id;

    const OwnedWorkspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id
        },
        attributes: ['id', 'WorkspaceName'],
    });

    const MemberWorkspace = await MemberModel.findAll({
        where: {
            UserId: Id
        },
        attributes: ['WorkspaceId']
    });

    const WorkspaceIds = MemberWorkspace.map(workspace => workspace.WorkspaceId);

    const MemberWorkspaces = await WorkspaceModel.findAll({
        where: { id: WorkspaceIds },
        attributes: ['id', 'WorkspaceName'],
    });

    res.status(200).json({
        success: true,
        message: "Workspaces retireved successfully",
        OwnedWorkspaces,
        MemberWorkspaces
    });
});

exports.SwitchWorkspace = catchAsyncError(async (req , res , next) => {
    const { WorkspaceId } = req.body;
    const Id = req.user.User.id;

    const User = await UserModel.findByPk(Id);

    if (!User) {
        return next(new ErrorHandler("User not found" , 400));
    }

    await User.setCurrentWorkspace(WorkspaceId);

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    res.status(200).json({
        success: true,
        message: "Workplace switched successfully",
        User,
        Workspace
    });
});
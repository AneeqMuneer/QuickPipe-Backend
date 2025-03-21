const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");

const UserModel = require("../Model/userModel");
const WorkspaceModel = require("../Model/workspaceModel");
const MemberModel = require("../Model/memberModel");
const APIModel = require("../Model/apiModel");

exports.CreateWorkspace = catchAsyncError(async (req, res, next) => {
    const { WorkspaceName } = req.body;
    const Id = req.user.User.id;

    if (!WorkspaceName) {
        return next(new ErrorHandler("Please fill the required details", 400));
    }

    const Workspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id,
            WorkspaceName
        }
    });

    if (Workspaces.length > 0) {
        return next(new ErrorHandler("A workspace with this name already exists.", 400));
    }

    const Workspace = await WorkspaceModel.create({
        WorkspaceName,
        OwnerId: Id
    });

    const API = await APIModel.create({
        WorkspaceId: Workspace.id
    });

    res.status(201).json({
        success: true,
        message: "Workspace created successfully",
        Workspace,
        API
    });
});

exports.UpdateWorkspace = catchAsyncError(async (req, res, next) => {
    const { WorkspaceName } = req.body;
    const WorkspaceId = req.user.User.CurrentWorkspaceId;
    const Id = req.user.User.id;

    if (!WorkspaceName) {
        return next(new ErrorHandler("Please fill the required details", 400));
    }

    const Workspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id,
            WorkspaceName
        }
    });

    if (Workspaces.length > 0) {
        return next(new ErrorHandler("A workspace with this name already exists.", 400));
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

exports.GetCurrentWorkspace = catchAsyncError(async (req, res, next) => {
    const WorkspaceId = req.user.User.CurrentWorkspaceId;

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    res.status(201).json({
        success: true,
        message: "Current workspace retrieved successfully",
        Workspace
    });
});

exports.GetAllUserWorkspace = catchAsyncError(async (req, res, next) => {
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

exports.SwitchWorkspace = catchAsyncError(async (req, res, next) => {
    const { WorkspaceId } = req.body;
    const Id = req.user.User.id;

    const User = await UserModel.findByPk(Id);

    if (!User) {
        return next(new ErrorHandler("User not found", 400));
    }

    const OwnedWorkspaces = await WorkspaceModel.findAll({
        where: {
            OwnerId: Id,
        },
        attributes: ['id', 'WorkspaceName'],
    });

    const MemberWorkspaces = await MemberModel.findAll({
        where: {
            UserId: Id
        },
        attributes: ['WorkspaceId']
    });

    const OwnedWorkspaceIds = OwnedWorkspaces.map(workspace => workspace.id);
    const MemberWorkspaceIds = MemberWorkspaces.map(workspace => workspace.WorkspaceId);

    if (![...OwnedWorkspaceIds, ...MemberWorkspaceIds].includes(WorkspaceId)) {
        return next(new ErrorHandler("You don't have access to this workspace", 403));
    }

    User.CurrentWorkspaceId = WorkspaceId;
    await User.save();

    const Workspace = await WorkspaceModel.findByPk(WorkspaceId);

    const API = await APIModel.findOne({
        where: {
            WorkspaceId
        }
    });

    res.status(200).json({
        success: true,
        message: "Workplace switched successfully",
        User,
        Workspace,
        API
    });
});
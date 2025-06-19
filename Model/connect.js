const { dbConnect } = require('../Data/db.js');

// import model files here
const UserModel = require('../Model/userModel');
const WorkspaceModel = require('../Model/workspaceModel');
const MemberModel = require("../Model/memberModel.js");
const CampaignModel = require("../Model/campaignModel.js");
const LeadModel = require("../Model/leadModel.js");
const SequenceModel = require("../Model/sequenceModel.js");
const ScheduleModel = require("../Model/scheduleModel.js");
const EmailAccountModel = require("../Model/emailAccountModel.js");
const CallModel = require("../Model/callModel.js");
const MeetingModel = require("../Model/meetingModel.js");
const OrderModel = require("../Model/orderModel.js");



// create relationships between models here
UserModel.hasMany(WorkspaceModel, { foreignKey: 'UserId', sourceKey: "id", onDelete: 'CASCADE' });
WorkspaceModel.belongsTo(UserModel, { foreignKey: 'OwnerId', targetKey: "id" });
WorkspaceModel.hasMany(UserModel, { foreignKey: 'CurrentWorkspaceId', sourceKey: "id", onDelete: 'CASCADE' });
UserModel.belongsTo(WorkspaceModel, { foreignKey: 'CurrentWorkspaceId', targetKey: "id" });

WorkspaceModel.hasMany(MemberModel, { foreignKey: 'WorkspaceId', onDelete: 'CASCADE', sourceKey: "id" });
MemberModel.belongsTo(WorkspaceModel, { foreignKey: 'WorkspaceId', targetKey: "id" });
UserModel.hasMany(MemberModel, { foreignKey: 'UserId', onDelete: 'CASCADE', sourceKey: "id" });
MemberModel.belongsTo(UserModel, { foreignKey: 'UserId', targetKey: "id" });

CampaignModel.hasOne(WorkspaceModel, { foreignKey: 'id', sourceKey: "WorkspaceId", onDelete: 'CASCADE' });
WorkspaceModel.belongsTo(CampaignModel, { foreignKey: 'id', targetKey: "WorkspaceId" });

CampaignModel.hasMany(LeadModel, { foreignKey: 'CampaignId', sourceKey: "id", onDelete: 'CASCADE' });
LeadModel.belongsTo(CampaignModel, { foreignKey: 'CampaignId', targetKey: "id" });

CampaignModel.hasOne(SequenceModel, { foreignKey: 'CampaignId', sourceKey: "id", onDelete: 'CASCADE' });
SequenceModel.belongsTo(CampaignModel, { foreignKey: 'CampaignId', targetKey: "id" });

CampaignModel.hasOne(ScheduleModel, { foreignKey: 'CampaignId', sourceKey: "id", onDelete: 'CASCADE' });
ScheduleModel.belongsTo(CampaignModel, { foreignKey: 'CampaignId', targetKey: "id" });

EmailAccountModel.hasOne(WorkspaceModel, { foreignKey: 'id', sourceKey: "WorkspaceId", onDelete: 'CASCADE' });
WorkspaceModel.belongsTo(EmailAccountModel, { foreignKey: 'id', targetKey: "WorkspaceId" });

LeadModel.hasMany(CallModel, { foreignKey: 'LeadId', sourceKey: 'id', onDelete: 'CASCADE' });
CallModel.belongsTo(LeadModel, { foreignKey: 'LeadId', targetKey: 'id' });

LeadModel.hasMany(MeetingModel, { foreignKey: 'LeadId', sourceKey: 'id', onDelete: 'CASCADE' });
MeetingModel.belongsTo(LeadModel, { foreignKey: 'LeadId', targetKey: 'id' });

UserModel.hasMany(MeetingModel, { foreignKey: 'HostId', sourceKey: 'id', onDelete: 'CASCADE' });
MeetingModel.belongsTo(UserModel, { foreignKey: 'HostId', targetKey: 'id' });

WorkspaceModel.hasMany(OrderModel, { foreignKey: 'WorkspaceId', sourceKey: "id", onDelete: 'CASCADE' });
OrderModel.belongsTo(WorkspaceModel, { foreignKey: 'WorkspaceId', targetKey: "id" });
UserModel.hasMany(OrderModel, { foreignKey: 'BuyerId', sourceKey: "id", onDelete: 'CASCADE' });
OrderModel.belongsTo(UserModel, { foreignKey: 'BuyerId', targetKey: "id" });



dbConnect().then(() => {
    console.log('Database connected and models synchronized.');
}).catch(err => {
    console.error('Error connecting database:', err);
});

module.exports = {
  User: UserModel,
  Workspace: WorkspaceModel,
  Member: MemberModel,
  Campaign: CampaignModel,
  Lead: LeadModel,
  Sequence: SequenceModel,
  Schedule: ScheduleModel,
  EmailAccount: EmailAccountModel,
  Calls: CallModel,
  Meetings: MeetingModel,
  Order: OrderModel
};
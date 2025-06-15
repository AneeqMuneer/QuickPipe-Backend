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



// create relationships between models here
UserModel.hasMany(WorkspaceModel, { foreignKey: 'UserId' , sourceKey: "id" , onDelete: 'CASCADE' });
WorkspaceModel.belongsTo(UserModel, { foreignKey: 'OwnerId' , targetKey: "id" });
WorkspaceModel.hasMany(UserModel, { foreignKey: 'CurrentWorkspaceId', sourceKey: "id" , onDelete: 'CASCADE'});
UserModel.belongsTo(WorkspaceModel, { foreignKey: 'CurrentWorkspaceId', targetKey: "id" });

WorkspaceModel.hasMany(MemberModel, { foreignKey: 'WorkspaceId', onDelete: 'CASCADE' , sourceKey: "id"});
MemberModel.belongsTo(WorkspaceModel, { foreignKey: 'WorkspaceId' , targetKey: "id"});
UserModel.hasMany(MemberModel, { foreignKey: 'UserId', onDelete: 'CASCADE' , sourceKey: "id"});
MemberModel.belongsTo(UserModel, { foreignKey: 'UserId' , targetKey: "id"});

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




dbConnect().then(() => {
    console.log('Database connected and models synchronized.');
}).catch(err => {
    console.error('Error connecting database:', err);
});
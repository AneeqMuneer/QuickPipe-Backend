const { dbConnect } = require('../Data/db.js');

// import model files here
const UserModel = require('../Model/userModel');
const WorkspaceModel = require('../Model/workspaceModel');
const MemberModel = require("../Model/memberModel.js");



// create relationships between models here
UserModel.hasMany(WorkspaceModel, { foreignKey: 'UserId' , sourceKey: "id" , onDelete: 'CASCADE' });
WorkspaceModel.belongsTo(UserModel, { foreignKey: 'OwnerId' , targetKey: "id" });
WorkspaceModel.hasMany(UserModel, { foreignKey: 'CurrentWorkspaceId', sourceKey: "id" , onDelete: 'CASCADE'});
UserModel.belongsTo(WorkspaceModel, { foreignKey: 'CurrentWorkspaceId', targetKey: "id" });

WorkspaceModel.hasMany(MemberModel, { foreignKey: 'WorkspaceId', onDelete: 'CASCADE' , sourceKey: "id"});
MemberModel.belongsTo(WorkspaceModel, { foreignKey: 'WorkspaceId' , targetKey: "id"});
UserModel.hasMany(MemberModel, { foreignKey: 'UserId', onDelete: 'CASCADE' , sourceKey: "id"});
MemberModel.belongsTo(UserModel, { foreignKey: 'UserId' , targetKey: "id"});





dbConnect().then(() => {
    console.log('Database connected and models synchronized.');
}).catch(err => {
    console.error('Error connecting database:', err);
});
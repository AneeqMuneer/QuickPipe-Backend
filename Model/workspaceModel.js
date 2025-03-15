const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Workspace = sequelize.define('Workspace', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    WorkspaceName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "My Default Workspace"
    },
    OwnerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'Workspaces',
    timestamps: true,
});

module.exports = Workspace;
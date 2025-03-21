const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const API = sequelize.define('API', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    WorkspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    SlackAPI: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    GoogleCalendarAPI: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    OpenAiAPI: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    HubspotAPI: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    SalesforceAPI: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'APIs',
    timestamps: true,
});

module.exports = API;
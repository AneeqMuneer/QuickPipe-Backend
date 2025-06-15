const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');
const { types } = require('pg');

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
    GoogleCalendarAccessToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    GoogleCalendarRefreshToken: {
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
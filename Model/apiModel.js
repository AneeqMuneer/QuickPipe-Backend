const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const API = sequelize.define('API', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    WorkspaceId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "My Default API"
    },
    OwnerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'APIs',
    timestamps: true,
});

module.exports = API;
const { DataTypes } = require("sequelize");
const { sequelize } = require("../Data/db.js");

const Sequence = sequelize.define('Sequence', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    CampaignId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
    },
    Emails: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
}, {
    tableName: 'Sequences',
    timestamps: true,
});

module.exports = Sequence;
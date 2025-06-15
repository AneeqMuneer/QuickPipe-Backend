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
        allowNull: false
    },
    Emails: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [{
            Name: "Step 1",
            Subject: "",
            Body: "",
            Delay: 0,
        }],
    },
}, {
    tableName: 'Sequences',
    timestamps: true,
});

module.exports = Sequence;
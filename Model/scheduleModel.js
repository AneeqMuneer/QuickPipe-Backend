const { DataTypes } = require("sequelize");
const { sequelize } = require("../Data/db.js");

const Schedule = sequelize.define('Schedule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    CampaignId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    StartDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    EndDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    Schedule: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [{
            Name: "Schedule 1",
            TimingFrom: "09:00:00",
            TimingTo: "17:00:00",
            Timezone: "UTC",
            Days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        }],
    },
}, {
    tableName: 'Schedules',
    timestamps: true,
});

module.exports = Schedule;
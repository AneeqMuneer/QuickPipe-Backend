const { DataTypes } = require("sequelize");
const { sequelize } = require("../Data/db.js");

const Campaign = sequelize.define(
  "Campaign",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    SequenceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    ScheduleId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    WorkspaceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Status: {
      type: DataTypes.ENUM("Active", "Paused", "Completed", "Cancelled"),
      allowNull: false,
      defaultValue: "Active",
    },
  },
  {
    tableName: "Campaigns",
    timestamps: true,
  }
);

module.exports = Campaign;
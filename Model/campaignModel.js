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
    Description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    StartDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    EndDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    Budget: {
      type: DataTypes.FLOAT,
      allowNull: true,
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
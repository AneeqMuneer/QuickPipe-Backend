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
    WorkspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Status: {
      type: DataTypes.ENUM("Active", "InActive", "Completed", "Error"),
      allowNull: false,
      defaultValue: "InActive",
    },
  },
  {
    tableName: "Campaigns",
    timestamps: true,
  }
);

module.exports = Campaign;
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    budget: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Active", "Paused", "Completed", "Cancelled"),
      allowNull: false,
      defaultValue: "Active",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "Campaigns",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Define Associations
const Lead = require("./leadModel.js");

Campaign.hasMany(Lead, { foreignKey: "campaignId", as: "leads" });
Lead.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });

module.exports = Campaign;

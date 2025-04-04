const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Lead = sequelize.define(
  'Lead',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      unique: true
    },
    Phone: {
      type: DataTypes.STRING(50),
      allowNull: true, // aa rha hai
      unique: true,
    },
    Company: {
      type: DataTypes.STRING,
      allowNull: true // aa rha hai
    },
    Status: {
      type: DataTypes.ENUM("Discovery", "Evaluation", "Proposal", "Negotiation", "Commit", "Closed"),
      allowNull: false,
      defaultValue: "Discovery"
    },
    CampaignId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    Website: {
      type: DataTypes.STRING,
      allowNull: true, // aa rha hai
    },
    Title: {
      type: DataTypes.STRING,
      allowNull: true, // aa rha hai
    },
    Location: {
      type: DataTypes.STRING,
      allowNull: true, // aa rha hai
    },
    LastInteraction: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'Leads',
    timestamps: true,
  }
);

module.exports = Lead;
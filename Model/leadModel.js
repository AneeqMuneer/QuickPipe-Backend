const { DataTypes} = require('sequelize');
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
      }
    },
    Phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Company: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Status: {
      type:DataTypes.ENUM,
      values: [
        "Discovery",
        "Evaluation",
        "Proposal",
        "Negotiation",
        "Commit",
        "Closed",
      ],
      allowNull: false,
      defaultValue: "Discovery",
    },
    CampaignId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    Website:{
      type:DataTypes.STRING,
      allowNull:true,
    },
    Title:{
      type:DataTypes.STRING,
      allowNull:true,
    },
    Location:{
      type:DataTypes.STRING,
    },
    EmployeeCount:{
      type:DataTypes.INTEGER,
    }
  },
  {
    tableName: 'Leads',
    timestamps: true,
  }
);

module.exports = Lead;
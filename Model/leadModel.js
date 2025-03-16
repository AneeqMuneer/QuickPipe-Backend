const { DataTypes} = require('sequelize');
const { sequelize } = require('../Data/db.js');
const { datacatalog } = require('googleapis/build/src/apis/datacatalog');

const Lead = sequelize.define(
  'Lead',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
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
    campaignId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'campaign_id',
      references: {
        model: 'Campaigns',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    website:{
      type:DataTypes.STRING,
      allowNull:true,
    },
    title:{
      type:DataTypes.STRING,
      allowNull:true,
    },
    location:{
      type:DataTypes.STRING,
    },
    employeeCount:{
      type:DataTypes.INTEGER,
    }

    
  },
  {
    tableName: 'Leads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = Lead;
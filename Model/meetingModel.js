const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Meetings = sequelize.define(
  'Meetings',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    Topic: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    MeetingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    MeetingTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    Attendees: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Meeting_Link: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    Notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    LeadId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Leads',
        key: 'id'
      }
    },
    HostId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  },
  {
    tableName: 'Meetings',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['LeadId']
      },
      {
        fields: ['HostId']
      }
    ]
  }
);

module.exports = Meetings; 
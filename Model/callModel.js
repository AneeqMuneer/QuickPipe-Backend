const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Calls = sequelize.define(
  'Calls',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    CallDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    CallDuration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    LeadId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    PhoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    tableName: 'Calls',
    timestamps: true,
  }
);

module.exports = Calls; 
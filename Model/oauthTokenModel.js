const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OAuthToken = sequelize.define(
  'OAuthToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    }
  },
  {
    tableName: 'OAuthTokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'provider']
      }
    ]
  }
);

module.exports = OAuthToken;
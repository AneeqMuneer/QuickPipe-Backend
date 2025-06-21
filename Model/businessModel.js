const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Business = sequelize.define(
    'Business',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        WorkspaceId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        WebsiteData: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            validate: {
                isArray(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('WebsiteData must be an array');
                    }
                },
                hasValidObjects(value) {
                    if (!value.every(obj => 
                        obj.hasOwnProperty('Url') && 
                        obj.hasOwnProperty('Data')
                    )) {
                        throw new Error('Each WebsiteData object must have link and data properties');
                    }
                }
            }
        },
        DocumentData: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            validate: {
                isArray(value) {
                    if (!Array.isArray(value)) {
                        throw new Error('DocumentData must be an array');
                    }
                },
                hasValidObjects(value) {
                    if (!value.every(obj => 
                        obj.hasOwnProperty('Name') && 
                        obj.hasOwnProperty('Data')
                    )) {
                        throw new Error('Each DocumentData object must have documentName and data properties');
                    }
                }
            }
        },
        BusinessName: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },
    {
        tableName: 'Businesses',
        timestamps: true,
    }
);

module.exports = Business;
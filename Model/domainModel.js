const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Domain = sequelize.define('Domain', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    OrderId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    DomainName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            args: true,
            msg: "This domain name already exists in the database"
        },
        set(value) {
            this.setDataValue('DomainName', value.toLowerCase());
        }
    },
    Price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    EapFee: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    Type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: {
                args: [['Premium', 'Not Premium']],
                msg: "Invalid domain type"
            }
        },
    },
    Duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
    },
    RenewalDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: () => {
            const now = new Date();
            now.setFullYear(now.getFullYear() + 1);
            return now;
        },
    },
    Purpose: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: {
                args: [['Email Hosting', 'Domain Forwarding']],
                msg: "Invalid domain purpose"
            }
        },
    },
    Verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    UpdatePurposeDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => {
            const now = new Date();
            now.setDate(now.getDate() + 3);
            return now;
        },
    },
}, {
    tableName: 'Domains',
    timestamps: true,
});

module.exports = Domain;
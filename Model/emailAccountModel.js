const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const EmailAccount = sequelize.define('EmailAccount', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    WorkspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    Email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: { msg: "Invalid email format" },
            notEmpty: { msg: "Email cannot be empty" },
            isLowercase: true,
        },
        set(value) {
            this.setDataValue('Email', value.toLowerCase());
        }
    },
    Provider: {
        type: DataTypes.ENUM("Google", "Microsoft"),
        allowNull: false,
    },
    RefreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    AccessToken: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ExpiresIn: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'EmailAccounts',
    timestamps: true,
});

module.exports = EmailAccount;
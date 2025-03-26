const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { GenerateAuthCode, GenerateTimestampAuthCode } = require("../Utils/userUtils.js");

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    FirstName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    LastName: {
        type: DataTypes.STRING,
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
    PhoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            is: {
                args: [/^\+?[1-9]\d{1,14}$/],
                msg: "Invalid phone number format. Use E.164 format (e.g., +1234567890)",
            },
        },
    },
    Password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: {
                args: [6, 255],
                msg: "Password must be at least 6 characters long.",
            },
        },
    },
    TFA: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    TFACode: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    TFAExpiration: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ResetActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CurrentWorkspaceId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    ProfilePhoto: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'Users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.Password) {
                const salt = bcrypt.genSaltSync(10, "a");
                user.Password = bcrypt.hashSync(user.Password, salt);
            }
        }
    }
});

User.prototype.getJWTToken = function () {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

User.prototype.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.Password);
};

User.prototype.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    return resetToken;
};

User.prototype.setCurrentWorkspace = async function(workspaceId) {
    this.CurrentWorkspaceId = workspaceId;
    await this.save();
    return this;
};

User.prototype.getAuthCode = async function () {
    let code;
    let isUnique = false;

    try {
        for (let i = 0; i < 5; i++) {
            code = await GenerateAuthCode();
            const existingUser = await User.findOne({ where: { TFACode: code } });
            if (!existingUser) {
                isUnique = true;
                break;
            }
        }

        if (!isUnique) {
            code = await GenerateTimestampAuthCode();
        }

        this.TFACode = code;
        this.TFAExpiration = new Date(Date.now() + 10 * 60 * 1000);
        await this.save();
        return code;
    } catch (error) {
        console.error("Error generating auth code:", error);
        throw error;
    }
};

User.prototype.IsCodeValid = async function () {
    if (this.TFACode && this.TFAExpiration && Date.now() > this.TFAExpiration) {
        this.TFACode = null;
        this.TFAExpiration = null;
        await this.save();
        return false;
    }
    this.TFACode = null;
    this.TFAExpiration = null;
    await this.save();
    return true;
}

module.exports = User;
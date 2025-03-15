const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Member = sequelize.define('Member', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    WorkspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    Role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['Admin', 'Editor']]
        }
    },
    IsInvite: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    InviteExpiration: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'Members',
    timestamps: true,
});

Member.prototype.IsInviteValid = function () {
    if (this.InviteExpiration && Date.now() > this.InviteExpiration) {
        return false;
    }
    return true;
}

module.exports = Member;
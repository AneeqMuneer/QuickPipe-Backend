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
    hooks: {
        beforeCreate: async (member) => {
            if (member.IsInvite) {
                member.InviteExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            }
        }
    }
});

Member.prototype.IsInviteValid = async function () {
    if (this.InviteExpiration && Date.now() > this.InviteExpiration) {
        return false;
    }
    return true;
}

module.exports = Member;
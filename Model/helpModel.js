const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const HelpDesk = sequelize.define('HelpDesk', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    Type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['Bug', 'Feature Request', 'Feedback']],
        },
    },
    Subject: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Attachment: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'HelpDesks',
    timestamps: true,
});

module.exports = HelpDesk;
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
    MailHostingConfiguration: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    Verification: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    WebForwardingConfiguration: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    WebForwardingUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: {
                msg: "Invalid URL"
            },
            validateUrlIfForwarding(value) {
                if (this.WebForwardingConfiguration && !value) {
                    throw new Error('URL is required when web forwarding is enabled');
                }
            }
        }
    }
}, {
    tableName: 'Domains',
    timestamps: true,
});

module.exports = Domain;
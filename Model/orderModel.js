const { DataTypes } = require('sequelize');
const { sequelize } = require('../Data/db.js');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    BuyerId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    WorkspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    Domains: {
        type: DataTypes.ARRAY(DataTypes.JSONB),
        allowNull: false,
    },
    /*
        Domains Object Structure:
            Name
            Price
            IsPremium
            EapFee (only if premium)
            Duration
            type (available, unavailable, or unregisterable)
    */
    TotalAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    StripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    StripePaymentStatus: {
        type: DataTypes.STRING,
        defaultValue: 'Pending',
        validate: {
            isIn: {
                args: [['Pending', 'Succeeded', 'Failed']],
                msg: "Invalid payment status"
            }
        },
    },
    OrderDate: {
        type: DataTypes.DATE,
        defaultValue: () => {
            const now = new Date();
            return now;
        },
    },
    DomainPurchaseStatus: {
        type: DataTypes.STRING,
        defaultValue: 'Pending',
        validate: {
            isIn: {
                args: [['Pending', 'Succeeded', 'Failed']],
                msg: "Invalid domain purchase status"
            }
        },
    },
}, {
    tableName: 'Orders',
    timestamps: true,
});

module.exports = Order;
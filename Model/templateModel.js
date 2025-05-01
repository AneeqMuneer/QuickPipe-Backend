const { DataTypes } = require("sequelize");
const { sequelize } = require("../Data/db.js");

const Template = sequelize.define(
    "Template",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        Name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        Subject: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        Body: {
            type: DataTypes.TEXT,
            allowNull: false,
        }
    },
    {
        tableName: "Templates",
        timestamps: true,
    }
);

module.exports = Template;  
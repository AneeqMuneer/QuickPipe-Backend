const { DataTypes } = require("sequelize");
const { sequelize } = require("../Data/db.js");

const Task = sequelize.define(
  "Task",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    Task_Title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    eventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    eventTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    Person: {
      type: DataTypes.STRING,
      allowNull: true,
    }, // not confirmed need clarity, part of workspace?
    Meeting_Link: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    Extra_Notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    GoogleEventId: {
      type: DataTypes.STRING,
      allowNull:true,
    },
    WorkspaceId: {
      type: DataTypes.STRING,
      allowNull:true,
    }
  },
  {
    tableName: "Tasks",
    timestamps: true,
  }
);

module.exports = Task;

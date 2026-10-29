const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.ENUM(
          'assignment',
          'status',
          'comment',
          'deadline',
          'approval',
          'system'
        ),
        allowNull: false,
        defaultValue: 'system',
      },
      message: { type: DataTypes.STRING(255), allowNull: false },
      link: { type: DataTypes.STRING(255), allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'notifications',
    }
  );

  return Notification;
};

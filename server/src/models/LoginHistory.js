const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginHistory = sequelize.define(
    'LoginHistory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      loginAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ipAddress: { type: DataTypes.STRING(60), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'login_history',
      timestamps: false,
    }
  );

  return LoginHistory;
};

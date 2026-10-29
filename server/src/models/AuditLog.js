const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      action: { type: DataTypes.STRING(120), allowNull: false },
      entityType: { type: DataTypes.STRING(60), allowNull: true },
      entityId: { type: DataTypes.INTEGER, allowNull: true },
      details: { type: DataTypes.JSON, allowNull: true },
      ipAddress: { type: DataTypes.STRING(60), allowNull: true },
    },
    {
      tableName: 'audit_logs',
      updatedAt: false, // append-only log
    }
  );

  return AuditLog;
};

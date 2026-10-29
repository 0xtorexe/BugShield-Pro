const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Traceability record for every assignment/reassignment/status change on a bug.
  const AssignmentHistory = sequelize.define(
    'AssignmentHistory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bugId: { type: DataTypes.INTEGER, allowNull: false },
      action: { type: DataTypes.STRING(120), allowNull: false },
      changedBy: { type: DataTypes.INTEGER, allowNull: true },
      oldValue: { type: DataTypes.STRING(255), allowNull: true },
      newValue: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'assignment_history',
      updatedAt: false,
    }
  );

  return AssignmentHistory;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // One assignment record per bug: the dedicated tester and who assigned it.
  // Multiple developers are tracked separately in BugDeveloper.
  const BugAssignment = sequelize.define(
    'BugAssignment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bugId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      testerId: { type: DataTypes.INTEGER, allowNull: true },
      assignedBy: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'bug_assignments',
    }
  );

  return BugAssignment;
};

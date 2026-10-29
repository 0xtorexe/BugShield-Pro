const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bug = sequelize.define(
    'Bug',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      projectId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      stepsToReproduce: { type: DataTypes.TEXT, allowNull: true },
      expectedResult: { type: DataTypes.TEXT, allowNull: true },
      actualResult: { type: DataTypes.TEXT, allowNull: true },
      environment: { type: DataTypes.STRING(255), allowNull: true },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: DataTypes.ENUM(
          'new',
          'assigned',
          'in_progress',
          'resolved',
          'verified',
          'reopened',
          'closed'
        ),
        allowNull: false,
        defaultValue: 'new',
      },
      // Tester who reported the bug.
      reporterId: { type: DataTypes.INTEGER, allowNull: false },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      tableName: 'bugs',
      paranoid: true,
    }
  );

  return Bug;
};

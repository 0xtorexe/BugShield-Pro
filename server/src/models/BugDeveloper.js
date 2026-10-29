const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Join table supporting multiple developers assigned to a single bug.
  const BugDeveloper = sequelize.define(
    'BugDeveloper',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bugId: { type: DataTypes.INTEGER, allowNull: false },
      developerId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'bug_developers',
      indexes: [{ unique: true, fields: ['bug_id', 'developer_id'] }],
    }
  );

  return BugDeveloper;
};

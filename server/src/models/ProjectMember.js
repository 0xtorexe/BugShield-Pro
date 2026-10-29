const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectMember = sequelize.define(
    'ProjectMember',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      projectId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      // Role the user plays within this specific project.
      roleInProject: {
        type: DataTypes.ENUM('manager', 'developer', 'tester'),
        allowNull: false,
      },
    },
    {
      tableName: 'project_members',
      indexes: [{ unique: true, fields: ['project_id', 'user_id'] }],
    }
  );

  return ProjectMember;
};

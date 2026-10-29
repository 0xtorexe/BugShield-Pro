const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define(
    'Project',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.STRING(80), allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      deadline: { type: DataTypes.DATEONLY, allowNull: true },
      // Cached completion percentage (0-100), recomputed from bug states.
      progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      managerId: { type: DataTypes.INTEGER, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'projects',
      paranoid: true, // soft delete
    }
  );

  return Project;
};

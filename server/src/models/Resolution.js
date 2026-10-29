const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Mandatory resolution report submitted by a developer when resolving a bug.
  const Resolution = sequelize.define(
    'Resolution',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bugId: { type: DataTypes.INTEGER, allowNull: false },
      developerId: { type: DataTypes.INTEGER, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      rootCause: { type: DataTypes.TEXT, allowNull: false },
      codeChangeSummary: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: 'resolutions',
    }
  );

  return Resolution;
};

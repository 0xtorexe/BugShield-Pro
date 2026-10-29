const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define(
    'Comment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bugId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: 'comments',
    }
  );

  return Comment;
};

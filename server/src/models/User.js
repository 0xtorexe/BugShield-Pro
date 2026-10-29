const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM('admin', 'manager', 'developer', 'tester'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      profilePicture: { type: DataTypes.STRING(255), allowNull: true },
      lastLogin: { type: DataTypes.DATE, allowNull: true },
      approvedBy: { type: DataTypes.INTEGER, allowNull: true },
      rejectedReason: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'users',
      paranoid: true, // soft delete via deleted_at
    }
  );

  // Never leak the password hash in JSON responses.
  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.deletedAt;
    return values;
  };

  return User;
};

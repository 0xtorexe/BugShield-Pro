const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const Project = require('./Project')(sequelize);
const ProjectMember = require('./ProjectMember')(sequelize);
const Bug = require('./Bug')(sequelize);
const BugAssignment = require('./BugAssignment')(sequelize);
const BugDeveloper = require('./BugDeveloper')(sequelize);
const Resolution = require('./Resolution')(sequelize);
const Comment = require('./Comment')(sequelize);
const Notification = require('./Notification')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const LoginHistory = require('./LoginHistory')(sequelize);
const AssignmentHistory = require('./AssignmentHistory')(sequelize);

/* ------------------------------ Associations ------------------------------ */

// Project <-> Manager (User)
Project.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
Project.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
User.hasMany(Project, { as: 'managedProjects', foreignKey: 'managerId' });

// Project team members
Project.belongsToMany(User, {
  through: ProjectMember,
  as: 'members',
  foreignKey: 'projectId',
  otherKey: 'userId',
});
User.belongsToMany(Project, {
  through: ProjectMember,
  as: 'projects',
  foreignKey: 'userId',
  otherKey: 'projectId',
});
ProjectMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
ProjectMember.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(ProjectMember, { as: 'projectMembers', foreignKey: 'projectId' });

// Bug <-> Project
Project.hasMany(Bug, { as: 'bugs', foreignKey: 'projectId' });
Bug.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });

// Bug reporter (tester)
Bug.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });

// Bug assignment (dedicated tester)
Bug.hasOne(BugAssignment, { as: 'assignment', foreignKey: 'bugId' });
BugAssignment.belongsTo(Bug, { as: 'bug', foreignKey: 'bugId' });
BugAssignment.belongsTo(User, { as: 'tester', foreignKey: 'testerId' });
BugAssignment.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });

// Bug developers (multiple)
Bug.belongsToMany(User, {
  through: BugDeveloper,
  as: 'developers',
  foreignKey: 'bugId',
  otherKey: 'developerId',
});
User.belongsToMany(Bug, {
  through: BugDeveloper,
  as: 'assignedBugs',
  foreignKey: 'developerId',
  otherKey: 'bugId',
});

// Resolutions
Bug.hasMany(Resolution, { as: 'resolutions', foreignKey: 'bugId' });
Resolution.belongsTo(Bug, { as: 'bug', foreignKey: 'bugId' });
Resolution.belongsTo(User, { as: 'developer', foreignKey: 'developerId' });

// Comments
Bug.hasMany(Comment, { as: 'comments', foreignKey: 'bugId' });
Comment.belongsTo(Bug, { as: 'bug', foreignKey: 'bugId' });
Comment.belongsTo(User, { as: 'author', foreignKey: 'userId' });

// Notifications
User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Audit / history
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });
LoginHistory.belongsTo(User, { as: 'user', foreignKey: 'userId' });
AssignmentHistory.belongsTo(Bug, { as: 'bug', foreignKey: 'bugId' });
AssignmentHistory.belongsTo(User, { as: 'changer', foreignKey: 'changedBy' });

const db = {
  sequelize,
  User,
  Project,
  ProjectMember,
  Bug,
  BugAssignment,
  BugDeveloper,
  Resolution,
  Comment,
  Notification,
  AuditLog,
  LoginHistory,
  AssignmentHistory,
};

module.exports = db;

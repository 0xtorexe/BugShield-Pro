const { Op } = require('sequelize');
const AppError = require('../../utils/AppError');
const { Project, User, ProjectMember, Bug } = require('../../models');
const { notify } = require('../../services/notification.service');

const managerInclude = { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'profilePicture'] };
const membersInclude = {
  model: ProjectMember,
  as: 'projectMembers',
  include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'profilePicture'] }],
};

async function listProjects({ user, status } = {}) {
  const where = {};
  if (status) where.status = status;

  // Managers see only projects they manage or are a member of.
  if (user && user.role === 'manager') {
    const memberships = await ProjectMember.findAll({ where: { userId: user.id } });
    const projectIds = memberships.map((m) => m.projectId);
    where[Op.or] = [{ managerId: user.id }, { id: { [Op.in]: projectIds } }];
  }

  return Project.findAll({
    where,
    include: [managerInclude, membersInclude],
    order: [['createdAt', 'DESC']],
  });
}

async function getProject(id) {
  const project = await Project.findByPk(id, { include: [managerInclude, membersInclude] });
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

async function createProject(data, adminId) {
  if (data.managerId) await assertRole(data.managerId, 'manager', 'Assigned manager');
  const project = await Project.create({ ...data, createdBy: adminId });
  if (project.managerId) {
    await ProjectMember.findOrCreate({
      where: { projectId: project.id, userId: project.managerId },
      defaults: { roleInProject: 'manager' },
    });
    await notify({
      userId: project.managerId,
      type: 'assignment',
      message: `You have been assigned to manage project "${project.name}"`,
      link: `/projects/${project.id}`,
    });
  }
  return getProject(project.id);
}

async function updateProject(id, data) {
  const project = await getProject(id);
  const prevManager = project.managerId;
  if (data.managerId) await assertRole(data.managerId, 'manager', 'Assigned manager');
  await project.update(data);

  if (data.managerId && data.managerId !== prevManager) {
    await ProjectMember.findOrCreate({
      where: { projectId: project.id, userId: data.managerId },
      defaults: { roleInProject: 'manager' },
    });
    await notify({
      userId: data.managerId,
      type: 'assignment',
      message: `You have been assigned to manage project "${project.name}"`,
      link: `/projects/${project.id}`,
    });
  }
  return getProject(id);
}

async function archiveProject(id) {
  const project = await getProject(id);
  project.status = 'archived';
  await project.save();
  return project;
}

async function restoreProject(id) {
  const project = await getProject(id);
  project.status = 'active';
  await project.save();
  return project;
}

async function deleteProject(id) {
  const project = await getProject(id);
  await project.destroy(); // paranoid soft delete
}

/** Add a developer/tester to the project team. */
async function addMember(projectId, userId, roleInProject) {
  await getProject(projectId);
  await assertRole(userId, roleInProject === 'manager' ? 'manager' : roleInProject, 'Member');
  const [member] = await ProjectMember.findOrCreate({
    where: { projectId, userId },
    defaults: { roleInProject },
  });
  await notify({
    userId,
    type: 'assignment',
    message: 'You have been added to a project team',
    link: `/projects/${projectId}`,
  });
  return member;
}

async function removeMember(projectId, userId) {
  const removed = await ProjectMember.destroy({ where: { projectId, userId } });
  if (!removed) throw new AppError('Team member not found', 404);
}

/**
 * Recompute progress as the share of a project's bugs that are resolved,
 * verified, or closed. Called after bug status changes.
 */
async function recomputeProgress(projectId) {
  const bugs = await Bug.findAll({ where: { projectId }, attributes: ['status'] });
  if (bugs.length === 0) {
    await Project.update({ progress: 0 }, { where: { id: projectId } });
    return 0;
  }
  const done = bugs.filter((b) => ['resolved', 'verified', 'closed'].includes(b.status)).length;
  const progress = Math.round((done / bugs.length) * 100);
  await Project.update({ progress }, { where: { id: projectId } });
  return progress;
}

async function assertRole(userId, role, label) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError(`${label} not found`, 404);
  if (user.role !== role) throw new AppError(`${label} must have the ${role} role`, 400);
  return user;
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  addMember,
  removeMember,
  recomputeProgress,
};

const { Op } = require('sequelize');
const AppError = require('../../utils/AppError');
const {
  Bug,
  Project,
  User,
  BugAssignment,
  BugDeveloper,
  Resolution,
  Comment,
  AssignmentHistory,
  ProjectMember,
} = require('../../models');
const { assertTransition } = require('./bugLifecycle');
const { notify, notifyMany } = require('../../services/notification.service');
const projectsService = require('../projects/projects.service');

const userAttrs = ['id', 'name', 'email', 'role', 'profilePicture'];

const fullInclude = [
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: User, as: 'reporter', attributes: userAttrs },
  { model: User, as: 'developers', attributes: userAttrs, through: { attributes: [] } },
  {
    model: BugAssignment,
    as: 'assignment',
    include: [{ model: User, as: 'tester', attributes: userAttrs }],
  },
  { model: Resolution, as: 'resolutions', include: [{ model: User, as: 'developer', attributes: userAttrs }] },
];

async function getBug(id) {
  const bug = await Bug.findByPk(id, { include: fullInclude });
  if (!bug) throw new AppError('Bug not found', 404);
  return bug;
}

/**
 * List bugs, scoped by the requesting user's role:
 *  - developer: bugs they are assigned to
 *  - tester: bugs they reported or are the dedicated tester for
 *  - manager/admin: all (optionally filtered by project)
 */
async function listBugs(user, filters = {}) {
  const where = {};
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;

  const include = [...fullInclude];

  if (user.role === 'developer') {
    const rows = await BugDeveloper.findAll({ where: { developerId: user.id }, attributes: ['bugId'] });
    where.id = { [Op.in]: rows.map((r) => r.bugId) };
  } else if (user.role === 'tester') {
    const assigned = await BugAssignment.findAll({ where: { testerId: user.id }, attributes: ['bugId'] });
    where[Op.or] = [{ reporterId: user.id }, { id: { [Op.in]: assigned.map((a) => a.bugId) } }];
  }

  return Bug.findAll({ where, include, order: [['createdAt', 'DESC']] });
}

/** Tester reports a new bug. */
async function createBug(data, reporter) {
  const project = await Project.findByPk(data.projectId);
  if (!project) throw new AppError('Project not found', 404);

  const bug = await Bug.create({ ...data, reporterId: reporter.id, status: 'new' });
  await AssignmentHistory.create({ bugId: bug.id, action: 'reported', changedBy: reporter.id, newValue: 'new' });
  await projectsService.recomputeProgress(bug.projectId);

  // Notify the project manager of the new report.
  if (project.managerId) {
    await notify({
      userId: project.managerId,
      type: 'assignment',
      message: `New ${bug.severity} bug reported in "${project.name}": ${bug.title}`,
      link: `/bugs/${bug.id}`,
    });
  }
  return getBug(bug.id);
}

async function updateBug(id, data, user) {
  const bug = await getBug(id);
  if (user.role === 'tester' && bug.reporterId !== user.id) {
    throw new AppError('You can only edit bugs you reported', 403);
  }
  // Testers may only edit the descriptive fields, never status directly here.
  const allowed = ['title', 'description', 'stepsToReproduce', 'expectedResult', 'actualResult', 'environment', 'severity', 'dueDate'];
  const patch = {};
  allowed.forEach((k) => {
    if (data[k] !== undefined) patch[k] = data[k];
  });
  await bug.update(patch);
  return getBug(id);
}

/**
 * Project Manager assigns one or more developers and a dedicated tester.
 * Moves the bug 'new' → 'assigned' and records history + notifications.
 */
async function assignBug(id, { developerIds = [], testerId }, actor) {
  const bug = await getBug(id);

  await validateProjectRole(bug.projectId, developerIds, 'developer');
  if (testerId) await validateProjectRole(bug.projectId, [testerId], 'tester');

  // Replace developer set.
  await BugDeveloper.destroy({ where: { bugId: bug.id } });
  await BugDeveloper.bulkCreate(developerIds.map((developerId) => ({ bugId: bug.id, developerId })));

  // Upsert the single assignment row (dedicated tester + assigner).
  const [assignment] = await BugAssignment.findOrCreate({
    where: { bugId: bug.id },
    defaults: { testerId: testerId || null, assignedBy: actor.id },
  });
  assignment.testerId = testerId || null;
  assignment.assignedBy = actor.id;
  await assignment.save();

  if (['new', 'reopened'].includes(bug.status)) {
    assertTransition(bug.status, 'assigned');
    bug.status = 'assigned';
    await bug.save();
  }

  await AssignmentHistory.create({
    bugId: bug.id,
    action: 'assigned',
    changedBy: actor.id,
    newValue: `devs:[${developerIds.join(',')}] tester:${testerId || '-'}`,
  });

  await notifyMany(developerIds, {
    type: 'assignment',
    message: `You have been assigned to bug: ${bug.title}`,
    link: `/bugs/${bug.id}`,
  });
  if (testerId) {
    await notify({ userId: testerId, type: 'assignment', message: `You are the verifying tester for: ${bug.title}`, link: `/bugs/${bug.id}` });
  }

  return getBug(id);
}

/**
 * Developer/tester advances the bug status. Resolving requires a resolution
 * report; verifying/reopening is restricted to the tester or manager.
 */
async function changeStatus(id, newStatus, user, payload = {}) {
  const bug = await getBug(id);
  assertTransition(bug.status, newStatus);

  const isDeveloper = bug.developers.some((d) => d.id === user.id);
  const isManagerOrAdmin = ['manager', 'admin'].includes(user.role);
  const isReporter = bug.reporterId === user.id;
  const isVerifyingTester = bug.assignment && bug.assignment.testerId === user.id;

  // Permission per transition.
  if (['in_progress', 'resolved'].includes(newStatus) && !(isDeveloper || isManagerOrAdmin)) {
    throw new AppError('Only assigned developers can update development status', 403);
  }
  if (['verified', 'reopened'].includes(newStatus) && !(isVerifyingTester || isReporter || isManagerOrAdmin)) {
    throw new AppError('Only the assigned tester or a manager can verify or reopen this bug', 403);
  }

  // Mandatory resolution report when resolving.
  if (newStatus === 'resolved') {
    const { description, rootCause, codeChangeSummary } = payload;
    if (!description || !rootCause || !codeChangeSummary) {
      throw new AppError('Resolution requires description, root cause, and code change summary', 400);
    }
    await Resolution.create({ bugId: bug.id, developerId: user.id, description, rootCause, codeChangeSummary });
  }

  const prev = bug.status;
  bug.status = newStatus;
  await bug.save();

  await AssignmentHistory.create({ bugId: bug.id, action: 'status_change', changedBy: user.id, oldValue: prev, newValue: newStatus });
  await projectsService.recomputeProgress(bug.projectId);

  // Notify stakeholders (reporter, tester, developers) of the change.
  const stakeholders = [bug.reporterId, bug.assignment?.testerId, ...bug.developers.map((d) => d.id)].filter(
    (uid) => uid && uid !== user.id
  );
  await notifyMany(stakeholders, {
    type: 'status',
    message: `Bug "${bug.title}" moved to ${newStatus.replace('_', ' ')}`,
    link: `/bugs/${bug.id}`,
  });

  return getBug(id);
}

/* --------------------------------- Comments -------------------------------- */

async function listComments(bugId) {
  await getBug(bugId);
  return Comment.findAll({
    where: { bugId },
    include: [{ model: User, as: 'author', attributes: userAttrs }],
    order: [['createdAt', 'ASC']],
  });
}

async function addComment(bugId, content, user) {
  const bug = await getBug(bugId);
  const comment = await Comment.create({ bugId, userId: user.id, content });

  const stakeholders = [bug.reporterId, bug.assignment?.testerId, ...bug.developers.map((d) => d.id)].filter(
    (uid) => uid && uid !== user.id
  );
  await notifyMany(stakeholders, {
    type: 'comment',
    message: `${user.name} commented on "${bug.title}"`,
    link: `/bugs/${bug.id}`,
  });

  return Comment.findByPk(comment.id, { include: [{ model: User, as: 'author', attributes: userAttrs }] });
}

/* --------------------------------- History --------------------------------- */

async function bugHistory(bugId) {
  await getBug(bugId);
  return AssignmentHistory.findAll({
    where: { bugId },
    include: [{ model: User, as: 'changer', attributes: userAttrs }],
    order: [['createdAt', 'ASC']],
  });
}

/** Ensure each candidate is a project member with the expected role. */
async function validateProjectRole(projectId, userIds, role) {
  if (!userIds.length) return;
  const members = await ProjectMember.findAll({
    where: { projectId, userId: { [Op.in]: userIds } },
    include: [{ model: User, as: 'user', attributes: ['id', 'role'] }],
  });
  const memberIds = new Set(members.map((m) => m.userId));
  const missing = userIds.filter((uid) => !memberIds.has(uid));
  if (missing.length) {
    throw new AppError(`User(s) ${missing.join(', ')} are not members of this project`, 400);
  }
  const wrongRole = members.filter((m) => m.user.role !== role);
  if (wrongRole.length) {
    throw new AppError(`Assigned ${role}s must have the ${role} role`, 400);
  }
}

module.exports = {
  getBug,
  listBugs,
  createBug,
  updateBug,
  assignBug,
  changeStatus,
  listComments,
  addComment,
  bugHistory,
};

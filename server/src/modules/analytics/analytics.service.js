const { fn, col, Op } = require('sequelize');
const { Bug, Project, User, Resolution, AssignmentHistory } = require('../../models');

function groupCount(rows, key) {
  return rows.reduce((acc, r) => {
    const k = r.get(key);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/** High-level counts + breakdowns for the dashboard. */
async function overview({ projectId } = {}) {
  const where = projectId ? { projectId } : {};

  const byStatusRows = await Bug.findAll({
    where,
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
  });
  const bySeverityRows = await Bug.findAll({
    where,
    attributes: ['severity', [fn('COUNT', col('id')), 'count']],
    group: ['severity'],
  });

  const byStatus = byStatusRows.reduce((a, r) => ({ ...a, [r.status]: Number(r.get('count')) }), {});
  const bySeverity = bySeverityRows.reduce((a, r) => ({ ...a, [r.severity]: Number(r.get('count')) }), {});

  const totalBugs = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const closedLike = (byStatus.resolved || 0) + (byStatus.verified || 0) + (byStatus.closed || 0);
  const resolutionRate = totalBugs ? Math.round((closedLike / totalBugs) * 100) : 0;

  const counts = {
    totalProjects: await Project.count(),
    activeProjects: await Project.count({ where: { status: 'active' } }),
    totalUsers: await User.count(),
    pendingUsers: await User.count({ where: { status: 'pending' } }),
    totalBugs,
    openBugs: totalBugs - closedLike,
    resolutionRate,
  };

  return { counts, byStatus, bySeverity };
}

/** Per-project progress with bug counts. */
async function projectProgress() {
  const projects = await Project.findAll({
    attributes: ['id', 'name', 'progress', 'status', 'deadline'],
    include: [{ model: Bug, as: 'bugs', attributes: ['id', 'status'] }],
  });
  return projects.map((p) => {
    const bugs = p.bugs || [];
    const done = bugs.filter((b) => ['resolved', 'verified', 'closed'].includes(b.status)).length;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      deadline: p.deadline,
      progress: p.progress,
      totalBugs: bugs.length,
      resolvedBugs: done,
    };
  });
}

/**
 * Team velocity: number of resolutions submitted per developer, a simple
 * proxy for throughput.
 */
async function teamVelocity() {
  const rows = await Resolution.findAll({
    attributes: ['developerId', [fn('COUNT', col('Resolution.id')), 'resolved']],
    group: ['developerId', 'developer.id'],
    include: [{ model: User, as: 'developer', attributes: ['id', 'name'] }],
  });
  return rows.map((r) => ({
    developerId: r.developerId,
    name: r.developer ? r.developer.name : `#${r.developerId}`,
    resolved: Number(r.get('resolved')),
  }));
}

module.exports = { overview, projectProgress, teamVelocity, groupCount };

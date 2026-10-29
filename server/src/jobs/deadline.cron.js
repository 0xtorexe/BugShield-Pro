const cron = require('node-cron');
const { Op } = require('sequelize');
const { Project, Bug, BugDeveloper, ProjectMember } = require('../models');
const { notify, notifyMany } = require('../services/notification.service');

function daysBetween(target) {
  const now = new Date();
  const d = new Date(target);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

/**
 * Scan active projects and open bugs for deadlines within the next 3 days (or
 * overdue) and raise deadline notifications for the responsible users.
 */
async function checkDeadlines() {
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  // Projects approaching / past deadline.
  const projects = await Project.findAll({
    where: { status: 'active', deadline: { [Op.ne]: null, [Op.lte]: soon } },
    include: [{ model: ProjectMember, as: 'projectMembers', attributes: ['userId'] }],
  });

  for (const project of projects) {
    const days = daysBetween(project.deadline);
    const msg =
      days < 0
        ? `Project "${project.name}" is overdue by ${Math.abs(days)} day(s)`
        : `Project "${project.name}" deadline is in ${days} day(s)`;
    const recipients = [project.managerId, ...project.projectMembers.map((m) => m.userId)];
    // eslint-disable-next-line no-await-in-loop
    await notifyMany(recipients, { type: 'deadline', message: msg, link: `/projects/${project.id}` });
  }

  // Bugs approaching / past due date (not yet closed).
  const bugs = await Bug.findAll({
    where: {
      dueDate: { [Op.ne]: null, [Op.lte]: soon },
      status: { [Op.notIn]: ['resolved', 'verified', 'closed'] },
    },
  });

  for (const bug of bugs) {
    const days = daysBetween(bug.dueDate);
    const msg =
      days < 0
        ? `Bug "${bug.title}" is overdue by ${Math.abs(days)} day(s)`
        : `Bug "${bug.title}" is due in ${days} day(s)`;
    // eslint-disable-next-line no-await-in-loop
    const devs = await BugDeveloper.findAll({ where: { bugId: bug.id }, attributes: ['developerId'] });
    const recipients = devs.map((d) => d.developerId);
    // eslint-disable-next-line no-await-in-loop
    await notifyMany(recipients, { type: 'deadline', message: msg, link: `/bugs/${bug.id}` });
  }

  return { projectsChecked: projects.length, bugsChecked: bugs.length };
}

/** Schedule the daily deadline sweep (09:00 every day). */
function startDeadlineCron() {
  cron.schedule('0 9 * * *', () => {
    checkDeadlines().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Deadline cron failed:', err.message);
    });
  });
}

module.exports = { startDeadlineCron, checkDeadlines };

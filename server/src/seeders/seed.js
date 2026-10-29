/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../models');
const { sequelize, User, Project, ProjectMember, Bug, BugAssignment, BugDeveloper, Resolution } = db;

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function run() {
  await sequelize.authenticate();
  console.log('Seeding database (this will reset all tables)...');
  await sequelize.sync({ force: true });

  // --- Admin ---
  const admin = await User.create({
    name: config.admin.name,
    email: config.admin.email,
    passwordHash: await hash(config.admin.password),
    role: 'admin',
    status: 'approved',
  });

  // --- Demo users (password: Passw0rd! for all) ---
  const pw = await hash('Passw0rd!');
  const manager = await User.create({ name: 'Priya Manager', email: 'manager@bugshield.com', passwordHash: pw, role: 'manager', status: 'approved', approvedBy: admin.id });
  const dev1 = await User.create({ name: 'Dinesh Developer', email: 'dev1@bugshield.com', passwordHash: pw, role: 'developer', status: 'approved', approvedBy: admin.id });
  const dev2 = await User.create({ name: 'Deepa Developer', email: 'dev2@bugshield.com', passwordHash: pw, role: 'developer', status: 'approved', approvedBy: admin.id });
  const tester = await User.create({ name: 'Tara Tester', email: 'tester@bugshield.com', passwordHash: pw, role: 'tester', status: 'approved', approvedBy: admin.id });
  // A pending user so the approval queue is not empty on first login.
  await User.create({ name: 'Pending Pat', email: 'pending@bugshield.com', passwordHash: pw, role: 'developer', status: 'pending' });

  // --- Project ---
  const project = await Project.create({
    name: 'Apollo Web Platform',
    description: 'Customer-facing web platform rebuild.',
    category: 'Web Application',
    status: 'active',
    startDate: '2026-06-01',
    deadline: '2026-09-30',
    managerId: manager.id,
    createdBy: admin.id,
  });

  await ProjectMember.bulkCreate([
    { projectId: project.id, userId: manager.id, roleInProject: 'manager' },
    { projectId: project.id, userId: dev1.id, roleInProject: 'developer' },
    { projectId: project.id, userId: dev2.id, roleInProject: 'developer' },
    { projectId: project.id, userId: tester.id, roleInProject: 'tester' },
  ]);

  // --- Bugs across lifecycle states ---
  // 1) New, unassigned
  await Bug.create({
    projectId: project.id, reporterId: tester.id, title: 'Login button unresponsive on Safari',
    description: 'Clicking login does nothing on Safari 17.', stepsToReproduce: '1. Open in Safari\n2. Click Login',
    expectedResult: 'User is logged in', actualResult: 'Nothing happens', environment: 'Safari 17 / macOS',
    severity: 'high', status: 'new',
  });

  // 2) Assigned + in progress
  const bug2 = await Bug.create({
    projectId: project.id, reporterId: tester.id, title: 'Dashboard charts fail to load',
    description: 'Analytics charts show a spinner forever.', stepsToReproduce: '1. Go to dashboard',
    expectedResult: 'Charts render', actualResult: 'Infinite spinner', environment: 'Chrome 126 / Windows',
    severity: 'critical', status: 'in_progress', dueDate: '2026-07-10',
  });
  await BugDeveloper.create({ bugId: bug2.id, developerId: dev1.id });
  await BugAssignment.create({ bugId: bug2.id, testerId: tester.id, assignedBy: manager.id });

  // 3) Resolved (with resolution report), awaiting verification
  const bug3 = await Bug.create({
    projectId: project.id, reporterId: tester.id, title: 'Password reset email not sent',
    description: 'No email arrives after requesting reset.', stepsToReproduce: '1. Request password reset',
    expectedResult: 'Email received', actualResult: 'No email', environment: 'Firefox 128 / Linux',
    severity: 'medium', status: 'resolved',
  });
  await BugDeveloper.bulkCreate([{ bugId: bug3.id, developerId: dev1.id }, { bugId: bug3.id, developerId: dev2.id }]);
  await BugAssignment.create({ bugId: bug3.id, testerId: tester.id, assignedBy: manager.id });
  await Resolution.create({
    bugId: bug3.id, developerId: dev1.id,
    description: 'Fixed SMTP credentials and retry logic.',
    rootCause: 'Expired SMTP API key caused silent failures.',
    codeChangeSummary: 'Updated mailer config, added retry + logging in mailer.service.js.',
  });

  // Recompute cached progress from bug states.
  const bugs = await Bug.findAll({ where: { projectId: project.id } });
  const done = bugs.filter((b) => ['resolved', 'verified', 'closed'].includes(b.status)).length;
  await project.update({ progress: Math.round((done / bugs.length) * 100) });

  console.log('\n✓ Seed complete. Accounts:');
  console.table([
    { role: 'admin', email: config.admin.email, password: config.admin.password },
    { role: 'manager', email: 'manager@bugshield.com', password: 'Passw0rd!' },
    { role: 'developer', email: 'dev1@bugshield.com', password: 'Passw0rd!' },
    { role: 'developer', email: 'dev2@bugshield.com', password: 'Passw0rd!' },
    { role: 'tester', email: 'tester@bugshield.com', password: 'Passw0rd!' },
  ]);

  await sequelize.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

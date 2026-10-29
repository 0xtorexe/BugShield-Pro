const catchAsync = require('../../utils/catchAsync');
const service = require('./projects.service');
const { logAudit } = require('../../utils/audit');

const list = catchAsync(async (req, res) => {
  const projects = await service.listProjects({ user: req.user, status: req.query.status });
  res.json({ success: true, data: projects });
});

const getOne = catchAsync(async (req, res) => {
  const project = await service.getProject(req.params.id);
  res.json({ success: true, data: project });
});

const create = catchAsync(async (req, res) => {
  const project = await service.createProject(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'project.create', entityType: 'Project', entityId: project.id }, req);
  res.status(201).json({ success: true, message: 'Project created', data: project });
});

const update = catchAsync(async (req, res) => {
  const project = await service.updateProject(req.params.id, req.body);
  await logAudit({ userId: req.user.id, action: 'project.update', entityType: 'Project', entityId: project.id }, req);
  res.json({ success: true, message: 'Project updated', data: project });
});

const archive = catchAsync(async (req, res) => {
  const project = await service.archiveProject(req.params.id);
  await logAudit({ userId: req.user.id, action: 'project.archive', entityType: 'Project', entityId: project.id }, req);
  res.json({ success: true, message: 'Project archived', data: project });
});

const restore = catchAsync(async (req, res) => {
  const project = await service.restoreProject(req.params.id);
  await logAudit({ userId: req.user.id, action: 'project.restore', entityType: 'Project', entityId: project.id }, req);
  res.json({ success: true, message: 'Project restored', data: project });
});

const remove = catchAsync(async (req, res) => {
  await service.deleteProject(req.params.id);
  await logAudit({ userId: req.user.id, action: 'project.delete', entityType: 'Project', entityId: Number(req.params.id) }, req);
  res.json({ success: true, message: 'Project deleted' });
});

const addMember = catchAsync(async (req, res) => {
  const member = await service.addMember(req.params.id, req.body.userId, req.body.roleInProject);
  await logAudit({ userId: req.user.id, action: 'project.add_member', entityType: 'Project', entityId: Number(req.params.id), details: req.body }, req);
  res.status(201).json({ success: true, message: 'Member added', data: member });
});

const removeMember = catchAsync(async (req, res) => {
  await service.removeMember(req.params.id, req.params.userId);
  await logAudit({ userId: req.user.id, action: 'project.remove_member', entityType: 'Project', entityId: Number(req.params.id), details: { userId: req.params.userId } }, req);
  res.json({ success: true, message: 'Member removed' });
});

module.exports = { list, getOne, create, update, archive, restore, remove, addMember, removeMember };

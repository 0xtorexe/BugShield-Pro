const catchAsync = require('../../utils/catchAsync');
const service = require('./users.service');
const { logAudit } = require('../../utils/audit');

const list = catchAsync(async (req, res) => {
  const users = await service.listUsers(req.query);
  res.json({ success: true, data: users });
});

const getOne = catchAsync(async (req, res) => {
  const user = await service.getUser(req.params.id);
  res.json({ success: true, data: user });
});

const approve = catchAsync(async (req, res) => {
  const user = await service.setStatus(req.params.id, 'approved', req.user.id);
  await logAudit({ userId: req.user.id, action: 'user.approve', entityType: 'User', entityId: user.id }, req);
  res.json({ success: true, message: 'User approved', data: user });
});

const reject = catchAsync(async (req, res) => {
  const user = await service.setStatus(req.params.id, 'rejected', req.user.id, req.body.reason);
  await logAudit({ userId: req.user.id, action: 'user.reject', entityType: 'User', entityId: user.id, details: { reason: req.body.reason } }, req);
  res.json({ success: true, message: 'User rejected', data: user });
});

const suspend = catchAsync(async (req, res) => {
  const user = await service.setStatus(req.params.id, 'suspended', req.user.id, req.body.reason);
  await logAudit({ userId: req.user.id, action: 'user.suspend', entityType: 'User', entityId: user.id }, req);
  res.json({ success: true, message: 'User suspended', data: user });
});

const reactivate = catchAsync(async (req, res) => {
  const user = await service.setStatus(req.params.id, 'approved', req.user.id);
  await logAudit({ userId: req.user.id, action: 'user.reactivate', entityType: 'User', entityId: user.id }, req);
  res.json({ success: true, message: 'User reactivated', data: user });
});

const create = catchAsync(async (req, res) => {
  const user = await service.createUser(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'user.create', entityType: 'User', entityId: user.id, details: { role: user.role } }, req);
  res.status(201).json({ success: true, message: 'User created', data: user });
});

module.exports = { list, getOne, approve, reject, suspend, reactivate, create };

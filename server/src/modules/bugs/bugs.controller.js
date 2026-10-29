const catchAsync = require('../../utils/catchAsync');
const service = require('./bugs.service');
const { logAudit } = require('../../utils/audit');

const list = catchAsync(async (req, res) => {
  const bugs = await service.listBugs(req.user, req.query);
  res.json({ success: true, data: bugs });
});

const getOne = catchAsync(async (req, res) => {
  const bug = await service.getBug(req.params.id);
  res.json({ success: true, data: bug });
});

const create = catchAsync(async (req, res) => {
  const bug = await service.createBug(req.body, req.user);
  await logAudit({ userId: req.user.id, action: 'bug.create', entityType: 'Bug', entityId: bug.id }, req);
  res.status(201).json({ success: true, message: 'Bug reported', data: bug });
});

const update = catchAsync(async (req, res) => {
  const bug = await service.updateBug(req.params.id, req.body, req.user);
  await logAudit({ userId: req.user.id, action: 'bug.update', entityType: 'Bug', entityId: bug.id }, req);
  res.json({ success: true, message: 'Bug updated', data: bug });
});

const assign = catchAsync(async (req, res) => {
  const bug = await service.assignBug(req.params.id, req.body, req.user);
  await logAudit({ userId: req.user.id, action: 'bug.assign', entityType: 'Bug', entityId: bug.id, details: req.body }, req);
  res.json({ success: true, message: 'Bug assigned', data: bug });
});

const changeStatus = catchAsync(async (req, res) => {
  const { status, ...payload } = req.body;
  const bug = await service.changeStatus(req.params.id, status, req.user, payload);
  await logAudit({ userId: req.user.id, action: 'bug.status', entityType: 'Bug', entityId: bug.id, details: { status } }, req);
  res.json({ success: true, message: `Bug moved to ${status}`, data: bug });
});

const listComments = catchAsync(async (req, res) => {
  const comments = await service.listComments(req.params.id);
  res.json({ success: true, data: comments });
});

const addComment = catchAsync(async (req, res) => {
  const comment = await service.addComment(req.params.id, req.body.content, req.user);
  res.status(201).json({ success: true, message: 'Comment added', data: comment });
});

const history = catchAsync(async (req, res) => {
  const rows = await service.bugHistory(req.params.id);
  res.json({ success: true, data: rows });
});

module.exports = { list, getOne, create, update, assign, changeStatus, listComments, addComment, history };

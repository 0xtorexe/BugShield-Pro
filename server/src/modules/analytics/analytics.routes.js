const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const service = require('./analytics.service');
const { AuditLog, LoginHistory, User } = require('../../models');

const router = express.Router();
router.use(authenticate);

router.get(
  '/overview',
  authorize('admin', 'manager'),
  catchAsync(async (req, res) => {
    res.json({ success: true, data: await service.overview(req.query) });
  })
);

router.get(
  '/projects',
  authorize('admin', 'manager'),
  catchAsync(async (req, res) => {
    res.json({ success: true, data: await service.projectProgress() });
  })
);

router.get(
  '/velocity',
  authorize('admin', 'manager'),
  catchAsync(async (req, res) => {
    res.json({ success: true, data: await service.teamVelocity() });
  })
);

// Audit trail (admin only)
router.get(
  '/audit',
  authorize('admin'),
  catchAsync(async (req, res) => {
    const logs = await AuditLog.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data: logs });
  })
);

// Login history (admin only)
router.get(
  '/logins',
  authorize('admin'),
  catchAsync(async (req, res) => {
    const logins = await LoginHistory.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['loginAt', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data: logins });
  })
);

module.exports = router;

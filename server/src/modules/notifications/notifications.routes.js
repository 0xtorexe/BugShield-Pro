const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const authenticate = require('../../middleware/authenticate');
const { Notification } = require('../../models');

const router = express.Router();
router.use(authenticate);

// List the current user's notifications (newest first).
router.get(
  '/',
  catchAsync(async (req, res) => {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    const unread = await Notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, data: notifications, meta: { unread } });
  })
);

// Mark one as read.
router.patch(
  '/:id/read',
  catchAsync(async (req, res) => {
    await Notification.update(
      { isRead: true },
      { where: { id: req.params.id, userId: req.user.id } }
    );
    res.json({ success: true, message: 'Marked as read' });
  })
);

// Mark all as read.
router.patch(
  '/read-all',
  catchAsync(async (req, res) => {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

module.exports = router;

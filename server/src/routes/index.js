const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', service: 'BugShield Pro API' }));

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/users.routes'));
router.use('/projects', require('../modules/projects/projects.routes'));
router.use('/bugs', require('../modules/bugs/bugs.routes'));
router.use('/notifications', require('../modules/notifications/notifications.routes'));
router.use('/analytics', require('../modules/analytics/analytics.routes'));

module.exports = router;

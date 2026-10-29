const express = require('express');
const { body } = require('express-validator');
const controller = require('./users.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Managers and admins may browse the user directory (e.g. to pick assignees).
router.get('/', authorize('admin', 'manager'), controller.list);
router.get('/:id', authorize('admin', 'manager'), controller.getOne);

// Admin-only provisioning actions
router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['manager', 'developer', 'tester']),
  ],
  validate,
  controller.create
);
router.patch('/:id/approve', authorize('admin'), controller.approve);
router.patch('/:id/reject', authorize('admin'), controller.reject);
router.patch('/:id/suspend', authorize('admin'), controller.suspend);
router.patch('/:id/reactivate', authorize('admin'), controller.reactivate);

module.exports = router;

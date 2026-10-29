const express = require('express');
const { body } = require('express-validator');
const controller = require('./projects.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// All approved roles can view projects (service scopes managers to their own).
router.get('/', controller.list);
router.get('/:id', controller.getOne);

const projectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('deadline').optional({ nullable: true }).isISO8601().withMessage('Deadline must be a date'),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Start date must be a date'),
  body('managerId').optional({ nullable: true }).isInt(),
];

// Admin-managed lifecycle
router.post('/', authorize('admin'), projectRules, validate, controller.create);
router.put('/:id', authorize('admin'), controller.update);
router.patch('/:id/archive', authorize('admin'), controller.archive);
router.patch('/:id/restore', authorize('admin'), controller.restore);
router.delete('/:id', authorize('admin'), controller.remove);

// Team allocation: admins or the project's manager
router.post(
  '/:id/members',
  authorize('admin', 'manager'),
  [body('userId').isInt(), body('roleInProject').isIn(['developer', 'tester', 'manager'])],
  validate,
  controller.addMember
);
router.delete('/:id/members/:userId', authorize('admin', 'manager'), controller.removeMember);

module.exports = router;

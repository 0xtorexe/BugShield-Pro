const express = require('express');
const { body } = require('express-validator');
const controller = require('./bugs.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/history', controller.history);
router.get('/:id/comments', controller.listComments);

// Tester reports a bug with the structured template.
router.post(
  '/',
  authorize('tester'),
  [
    body('projectId').isInt().withMessage('projectId is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
  ],
  validate,
  controller.create
);

// Tester edits their own report.
router.put('/:id', authorize('tester', 'manager', 'admin'), controller.update);

// Project Manager assigns developers + dedicated tester.
router.post(
  '/:id/assign',
  authorize('manager', 'admin'),
  [
    body('developerIds').isArray({ min: 1 }).withMessage('At least one developer is required'),
    body('developerIds.*').isInt(),
    body('testerId').optional({ nullable: true }).isInt(),
  ],
  validate,
  controller.assign
);

// Workflow transitions (developer / tester / manager).
router.patch(
  '/:id/status',
  [body('status').isIn(['assigned', 'in_progress', 'resolved', 'verified', 'reopened', 'closed'])],
  validate,
  controller.changeStatus
);

// Comments
router.post(
  '/:id/comments',
  [body('content').trim().notEmpty().withMessage('Comment cannot be empty')],
  validate,
  controller.addComment
);

module.exports = router;

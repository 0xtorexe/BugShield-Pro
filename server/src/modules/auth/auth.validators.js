const { body } = require('express-validator');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['developer', 'tester']).withMessage('Role must be developer or tester'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 120 }),
];

module.exports = { registerRules, loginRules, changePasswordRules, updateProfileRules };

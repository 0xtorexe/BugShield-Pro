const express = require('express');
const controller = require('./auth.controller');
const validators = require('./auth.validators');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const upload = require('../../middleware/upload');

const router = express.Router();

router.post('/register', validators.registerRules, validate, controller.register);
router.post('/login', validators.loginRules, validate, controller.login);

// Authenticated self-service
router.get('/me', authenticate, controller.me);
router.patch(
  '/profile',
  authenticate,
  upload.single('profilePicture'),
  validators.updateProfileRules,
  validate,
  controller.updateProfile
);
router.patch(
  '/password',
  authenticate,
  validators.changePasswordRules,
  validate,
  controller.changePassword
);

module.exports = router;

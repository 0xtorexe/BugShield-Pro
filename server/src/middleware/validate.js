const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Runs after an express-validator chain. Collects errors and throws a 400
 * AppError with field details when validation fails.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new AppError('Validation error', 400, details));
  }
  return next();
}

module.exports = validate;

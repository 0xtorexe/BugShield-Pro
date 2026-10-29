const AppError = require('../utils/AppError');

/**
 * Role guard. Usage: router.get('/x', authenticate, authorize('admin'), handler).
 * Must run after `authenticate` (relies on req.user).
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    return next();
  };
}

module.exports = authorize;

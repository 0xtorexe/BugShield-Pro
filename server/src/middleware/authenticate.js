const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const { User } = require('../models');

/**
 * Verifies the Bearer JWT, loads the user, and rejects any account that is not
 * in the 'approved' state (pending/rejected/suspended cannot use the API).
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication required', 401);

    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(payload.id);
    if (!user) throw new AppError('User no longer exists', 401);

    if (user.status !== 'approved') {
      throw new AppError(`Account is ${user.status}; access denied`, 403);
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticate;

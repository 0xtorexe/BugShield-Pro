const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../../utils/AppError');
const { User, LoginHistory } = require('../../models');

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Self-registration. Only developer/tester roles may self-register; the account
 * starts in 'pending' and requires admin approval before login is allowed.
 */
async function register({ name, email, password, role }) {
  if (!['developer', 'tester'].includes(role)) {
    throw new AppError('You may only register as a developer or tester', 400);
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role, status: 'pending' });
  return user;
}

/**
 * Authenticate credentials. Blocks non-approved accounts with a clear message,
 * records login history, and stamps lastLogin.
 */
async function login({ email, password }, req) {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401);

  if (user.status === 'pending') {
    throw new AppError('Your account is awaiting administrator approval', 403);
  }
  if (user.status === 'rejected') {
    throw new AppError('Your registration was rejected by the administrator', 403);
  }
  if (user.status === 'suspended') {
    throw new AppError('Your account has been suspended', 403);
  }

  user.lastLogin = new Date();
  await user.save();

  await LoginHistory.create({
    userId: user.id,
    ipAddress: req ? req.ip : null,
    userAgent: req ? req.headers['user-agent'] : null,
  });

  return { user, token: signToken(user) };
}

async function changePassword(user, currentPassword, newPassword) {
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400);
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
}

async function updateProfile(user, { name, profilePicture }) {
  if (name !== undefined) user.name = name;
  if (profilePicture !== undefined) user.profilePicture = profilePicture;
  await user.save();
  return user;
}

module.exports = { register, login, changePassword, updateProfile, signToken };

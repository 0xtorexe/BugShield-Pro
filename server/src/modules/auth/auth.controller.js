const catchAsync = require('../../utils/catchAsync');
const authService = require('./auth.service');
const { logAudit } = require('../../utils/audit');

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  await logAudit({ userId: user.id, action: 'auth.register', entityType: 'User', entityId: user.id }, req);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Await administrator approval before logging in.',
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const { user, token } = await authService.login(req.body, req);
  await logAudit({ userId: user.id, action: 'auth.login', entityType: 'User', entityId: user.id }, req);
  res.json({ success: true, data: { user, token } });
});

const me = catchAsync(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const updateProfile = catchAsync(async (req, res) => {
  const patch = { name: req.body.name };
  if (req.file) patch.profilePicture = `/uploads/${req.file.filename}`;
  const user = await authService.updateProfile(req.user, patch);
  res.json({ success: true, message: 'Profile updated', data: user });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user, req.body.currentPassword, req.body.newPassword);
  await logAudit({ userId: req.user.id, action: 'auth.password_change' }, req);
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, me, updateProfile, changePassword };

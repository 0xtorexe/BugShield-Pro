const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const AppError = require('../../utils/AppError');
const { User } = require('../../models');
const { notify } = require('../../services/notification.service');

async function listUsers({ role, status, search } = {}) {
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  return User.findAll({ where, order: [['createdAt', 'DESC']] });
}

async function getUser(id) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function setStatus(id, status, adminId, reason) {
  const user = await getUser(id);
  if (user.role === 'admin') throw new AppError('Administrator accounts cannot be modified', 400);

  user.status = status;
  if (status === 'approved') {
    user.approvedBy = adminId;
    user.rejectedReason = null;
  }
  if (status === 'rejected') user.rejectedReason = reason || 'Not specified';
  await user.save();

  const messages = {
    approved: 'Your account has been approved. You can now log in.',
    rejected: `Your registration was rejected${reason ? `: ${reason}` : ''}.`,
    suspended: 'Your account has been suspended by an administrator.',
  };
  if (messages[status]) {
    await notify({ userId: user.id, type: 'approval', message: messages[status], link: '/' });
  }
  return user;
}

/** Admin-created accounts (e.g. Project Managers) are approved immediately. */
async function createUser({ name, email, password, role }, adminId) {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists', 409);
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email,
    passwordHash,
    role,
    status: 'approved',
    approvedBy: adminId,
  });
}

module.exports = { listUsers, getUser, setStatus, createUser };

const { Notification } = require('../models');
const { emitToUser } = require('../realtime/socket');

/**
 * Persist a notification and push it in real time to the recipient.
 *
 * @param {object} opts
 * @param {number} opts.userId  recipient
 * @param {string} opts.type    one of the Notification type enum values
 * @param {string} opts.message human-readable message
 * @param {string} [opts.link]  client route the notification points to
 * @returns {Promise<Notification>}
 */
async function notify({ userId, type, message, link }) {
  const notification = await Notification.create({ userId, type, message, link });
  emitToUser(userId, 'notification:new', notification.toJSON());
  return notification;
}

/** Notify many users at once (deduplicated, skips falsy ids). */
async function notifyMany(userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean))];
  return Promise.all(unique.map((userId) => notify({ ...payload, userId })));
}

module.exports = { notify, notifyMany };

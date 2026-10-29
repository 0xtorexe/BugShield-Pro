const { AuditLog } = require('../models');

/**
 * Append an entry to the audit log. Best-effort: failures are swallowed so an
 * audit write never breaks the primary request flow.
 *
 * @param {object} opts
 * @param {number|null} opts.userId  actor performing the action
 * @param {string} opts.action       short action code, e.g. 'user.approve'
 * @param {string} [opts.entityType] target entity type, e.g. 'Project'
 * @param {number} [opts.entityId]   target entity id
 * @param {object} [opts.details]    arbitrary JSON context
 * @param {object} [req]             express request (for IP capture)
 */
async function logAudit({ userId, action, entityType, entityId, details }, req) {
  try {
    await AuditLog.create({
      userId: userId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      details: details ?? null,
      ipAddress: req ? req.ip : null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };

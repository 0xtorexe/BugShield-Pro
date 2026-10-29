const AppError = require('../../utils/AppError');

/**
 * Allowed bug status transitions. The workflow is enforced server-side so no
 * client can skip states (e.g. jump 'new' straight to 'resolved').
 *
 *   new ─▶ assigned ─▶ in_progress ─▶ resolved ─▶ verified ─▶ closed
 *                                          │            ▲
 *                                          └▶ reopened ─┘ (▶ assigned/in_progress)
 */
const TRANSITIONS = {
  new: ['assigned'],
  assigned: ['in_progress', 'reopened'],
  in_progress: ['resolved'],
  resolved: ['verified', 'reopened'],
  verified: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress'],
  closed: [],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new AppError(
      `Invalid status transition: '${from}' → '${to}'. Allowed next: ${
        (TRANSITIONS[from] || []).join(', ') || 'none'
      }`,
      400
    );
  }
}

module.exports = { TRANSITIONS, canTransition, assertTransition };

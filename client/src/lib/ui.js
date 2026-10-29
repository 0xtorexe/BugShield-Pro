// Shared display helpers: colour mappings and label formatting.

export const severityStyle = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const statusStyle = {
  new: 'bg-sky-100 text-sky-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  verified: 'bg-teal-100 text-teal-800',
  reopened: 'bg-rose-100 text-rose-800',
  closed: 'bg-gray-200 text-gray-700',
};

export const userStatusStyle = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-200 text-gray-700',
};

export const roleStyle = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-indigo-100 text-indigo-800',
  developer: 'bg-blue-100 text-blue-800',
  tester: 'bg-teal-100 text-teal-800',
};

export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
export const formatDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

// Allowed next statuses per current status (mirrors the server state machine).
export const nextStatuses = {
  new: ['assigned'],
  assigned: ['in_progress', 'reopened'],
  in_progress: ['resolved'],
  resolved: ['verified', 'reopened'],
  verified: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress'],
  closed: [],
};

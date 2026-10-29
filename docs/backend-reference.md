# Backend Reference

Public functions, classes, and middleware in `server/src/`. Signatures are grouped by file.
Services contain the business logic; controllers are thin adapters over them (see the
[API reference](./api-reference.md) for HTTP-level detail).

---

## Config

### `config/index.js`
Exports a plain `config` object built from environment variables (via `dotenv`):

```
config = {
  env, port, clientUrl,
  db:   { host, port, name, user, password },
  jwt:  { secret, expiresIn },
  admin:{ email, password, name },   // used by the seeder
}
```

### `config/database.js`
Exports a configured **Sequelize** instance (`mysql2` dialect, `underscored`, timestamps,
connection pool). Imported by `models/index.js` and directly where a raw instance is needed.

---

## Models — `models/`

Each `models/<Name>.js` exports a factory `(sequelize) => Model`. `models/index.js` instantiates
them all, declares associations, and exports the `db` object:

```
db = { sequelize, User, Project, ProjectMember, Bug, BugAssignment, BugDeveloper,
       Resolution, Comment, Notification, AuditLog, LoginHistory, AssignmentHistory }
```

Notable model behavior:

- **`User.prototype.toJSON`** strips `passwordHash` and `deletedAt` from every serialization.
- `User`, `Project`, `Bug` are `paranoid: true` (soft delete).
- `AuditLog` and `AssignmentHistory` are append-only (`updatedAt: false`); `LoginHistory` has no
  timestamps beyond its own `loginAt`.

Full column detail: [database schema](./database-schema.md).

---

## Middleware — `middleware/`

### `authenticate(req, res, next)`
Verifies the `Bearer` JWT, loads the `User`, and rejects the request unless
`user.status === 'approved'`. On success sets `req.user`. Throws `AppError(401|403)`.

### `authorize(...allowedRoles) → (req, res, next)`
Role guard; must run after `authenticate`. Throws `AppError(403)` if `req.user.role` is not in
`allowedRoles`.

### `validate(req, res, next)`
Collects `express-validator` results; on failure throws `AppError(400, details[])`.

### `upload`
Configured **Multer** instance (disk storage → `server/uploads/`). Filenames become
`avatar-<userId>-<timestamp><ext>`. Accepts images only, 2 MB limit. Use as
`upload.single('profilePicture')`.

### `errorHandler` module
- `errorHandler(err, req, res, next)` — central error shaper. Maps Sequelize validation/unique
  errors to `400`, JWT errors to `401`, otherwise uses `err.statusCode || 500`. Includes a stack
  trace only in development for 500s.
- `notFound(req, res)` — terminal `404` JSON for unmatched routes.

---

## Utilities — `utils/`

### `AppError` (class)
```
new AppError(message, statusCode = 500, details = null)
```
Operational error carrying an HTTP status and optional `details`. Thrown throughout services and
translated by `errorHandler`.

### `catchAsync(fn) → (req, res, next)`
Wraps an async handler so rejected promises reach `next` (and thus `errorHandler`). Every
controller is wrapped in this.

### `audit.logAudit({ userId, action, entityType?, entityId?, details? }, req?)`
Best-effort append to `audit_logs` (captures `req.ip`). Never throws — a failed audit write is
logged and swallowed so it can't break the primary request.

---

## Realtime — `realtime/socket.js`

| Export | Signature | Description |
|---|---|---|
| `initSocket(server)` | `(http.Server) → io` | Attaches Socket.io, authenticates the handshake JWT, joins each client to `user:<id>` |
| `emitToUser(userId, event, payload)` | `→ void` | Emits to a single user's room; no-op if Socket.io isn't initialized |
| `getIo()` | `→ io \| null` | Accessor for the initialized server |

---

## Notification service — `services/notification.service.js`

| Export | Signature | Description |
|---|---|---|
| `notify({ userId, type, message, link? })` | `→ Promise<Notification>` | Persist a notification **and** push it via `emitToUser` |
| `notifyMany(userIds, payload)` | `→ Promise<Notification[]>` | Deduplicate ids (drops falsy) and `notify` each |

`type ∈ { assignment, status, comment, deadline, approval, system }`.

---

## Auth module — `modules/auth/`

### `auth.service.js`
| Function | Signature | Notes |
|---|---|---|
| `register({ name, email, password, role })` | `→ Promise<User>` | Only developer/tester; hashes password; status = pending; 409 on dup email |
| `login({ email, password }, req)` | `→ Promise<{ user, token }>` | bcrypt verify; blocks non-approved with specific message; writes `LoginHistory`; stamps `lastLogin` |
| `changePassword(user, currentPassword, newPassword)` | `→ Promise<void>` | Verifies current password before hashing new one |
| `updateProfile(user, { name?, profilePicture? })` | `→ Promise<User>` | Patches allowed profile fields |
| `signToken(user)` | `→ string` | Signs `{ id, role }` with `JWT_SECRET` |

**Controller** (`auth.controller.js`): `register`, `login`, `me`, `updateProfile`,
`changePassword`. **Validators** (`auth.validators.js`): `registerRules`, `loginRules`,
`changePasswordRules`, `updateProfileRules`.

---

## Users module — `modules/users/`

### `users.service.js`
| Function | Signature | Notes |
|---|---|---|
| `listUsers({ role?, status?, search? })` | `→ Promise<User[]>` | Filtered directory, newest first |
| `getUser(id)` | `→ Promise<User>` | 404 if missing |
| `setStatus(id, status, adminId, reason?)` | `→ Promise<User>` | Approve/reject/suspend; refuses admin targets; sends approval-type notification |
| `createUser({ name, email, password, role }, adminId)` | `→ Promise<User>` | Pre-approved admin-created account |

**Controller:** `list`, `getOne`, `approve`, `reject`, `suspend`, `reactivate`, `create` — each
writes an audit-log entry.

---

## Projects module — `modules/projects/`

### `projects.service.js`
| Function | Signature | Notes |
|---|---|---|
| `listProjects({ user?, status? })` | `→ Promise<Project[]>` | Managers scoped to managed/member projects |
| `getProject(id)` | `→ Promise<Project>` | Includes manager + members; 404 if missing |
| `createProject(data, adminId)` | `→ Promise<Project>` | Validates manager role; adds manager as member; notifies |
| `updateProject(id, data)` | `→ Promise<Project>` | Re-notifies on manager change |
| `archiveProject(id)` / `restoreProject(id)` | `→ Promise<Project>` | Toggle status |
| `deleteProject(id)` | `→ Promise<void>` | Paranoid soft delete |
| `addMember(projectId, userId, roleInProject)` | `→ Promise<ProjectMember>` | Validates role; notifies member |
| `removeMember(projectId, userId)` | `→ Promise<void>` | 404 if not a member |
| `recomputeProgress(projectId)` | `→ Promise<number>` | Progress = % of bugs resolved/verified/closed |
| `assertRole(userId, role, label)` | `→ Promise<User>` | Guard used internally |

**Controller:** `list`, `getOne`, `create`, `update`, `archive`, `restore`, `remove`,
`addMember`, `removeMember`.

---

## Bugs module — `modules/bugs/`

### `bugLifecycle.js`
| Export | Signature | Notes |
|---|---|---|
| `TRANSITIONS` | object | Adjacency map of allowed status → next statuses |
| `canTransition(from, to)` | `→ boolean` | Membership test |
| `assertTransition(from, to)` | `→ void` | Throws `AppError(400)` on an illegal edge (identity allowed) |

### `bugs.service.js`
| Function | Signature | Notes |
|---|---|---|
| `getBug(id)` | `→ Promise<Bug>` | Full include graph; 404 if missing |
| `listBugs(user, filters)` | `→ Promise<Bug[]>` | Role-scoped (dev/tester/manager) + `projectId/status/severity` |
| `createBug(data, reporter)` | `→ Promise<Bug>` | status = new; history entry; notifies PM; recomputes progress |
| `updateBug(id, data, user)` | `→ Promise<Bug>` | Descriptive fields only; testers limited to own reports |
| `assignBug(id, { developerIds, testerId }, actor)` | `→ Promise<Bug>` | Validates project membership/roles; replaces devs; upserts assignment; new/reopened→assigned; history + notifications |
| `changeStatus(id, newStatus, user, payload)` | `→ Promise<Bug>` | Enforces transition + role + mandatory resolution; history; progress; stakeholder notifications |
| `listComments(bugId)` | `→ Promise<Comment[]>` | Thread with authors |
| `addComment(bugId, content, user)` | `→ Promise<Comment>` | Notifies other stakeholders |
| `bugHistory(bugId)` | `→ Promise<AssignmentHistory[]>` | Chronological traceability |
| `validateProjectRole(projectId, userIds, role)` | `→ Promise<void>` | Ensures assignees are project members with the right role |

**Controller:** `list`, `getOne`, `create`, `update`, `assign`, `changeStatus`, `listComments`,
`addComment`, `history`.

---

## Notifications module — `modules/notifications/`

Route-only module (no separate service). Endpoints read/update the current user's
`Notification` rows: list (+ unread count), mark one read, mark all read. See
[API reference](./api-reference.md#notifications--apinotifications).

---

## Analytics module — `modules/analytics/`

### `analytics.service.js`
| Function | Signature | Returns |
|---|---|---|
| `overview({ projectId? })` | `→ Promise<{ counts, byStatus, bySeverity }>` | Dashboard aggregates incl. resolution rate |
| `projectProgress()` | `→ Promise<Array>` | Per-project totals + resolved counts + progress |
| `teamVelocity()` | `→ Promise<Array>` | Resolutions grouped by developer |
| `groupCount(rows, key)` | helper | Frequency map |

**Routes** also expose admin-only `/audit` and `/logins` reading `AuditLog` / `LoginHistory`
directly.

---

## Jobs — `jobs/deadline.cron.js`

| Export | Signature | Notes |
|---|---|---|
| `startDeadlineCron()` | `→ void` | Schedules the sweep at `0 9 * * *` (daily 09:00) |
| `checkDeadlines()` | `→ Promise<{ projectsChecked, bugsChecked }>` | Notifies on projects/bugs due within 3 days or overdue; exported for manual/testing use |

---

## App bootstrap

### `app.js`
Builds and exports the Express `app`: `helmet`, `cors` (locked to `CLIENT_URL`), body parsers,
`morgan` (dev), static `/uploads`, the `/api` router, then `notFound` + `errorHandler`.

### `server.js`
Entry point: authenticate DB → `sequelize.sync({ alter })` in dev → create HTTP server →
`initSocket` → `startDeadlineCron` → listen on `PORT`. Exits non-zero on startup failure.

### `seeders/seed.js`
`npm run seed`. **Destructive** — `sequelize.sync({ force: true })` drops & recreates all tables,
then inserts the admin, demo users (one pending), a project with a team, and bugs spanning
lifecycle states including a resolution report. Prints the demo credential table.

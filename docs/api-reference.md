# API Reference

Base URL: **`http://localhost:5000/api`**

- All responses are JSON with a consistent envelope.
- Protected endpoints require an `Authorization: Bearer <token>` header.
- Only **approved** accounts can call protected endpoints; `pending`/`rejected`/`suspended`
  users receive `403` at authentication.

### Response envelope

```jsonc
// Success
{ "success": true, "message": "…", "data": { … }, "meta": { … } }

// Error
{ "success": false, "message": "Validation error", "details": [ { "field": "email", "message": "…" } ] }
```

### Status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation / bad request (e.g. illegal status transition) |
| 401 | Missing/invalid token |
| 403 | Authenticated but not authorized (wrong role or non-approved account) |
| 404 | Not found |
| 409 | Conflict (duplicate email) |
| 500 | Server error |

### Roles

`admin` · `manager` · `developer` · `tester`. The **Roles** column below lists who may call each
endpoint. "Any" = any authenticated, approved user.

---

## Auth — `/api/auth`

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/register` | Public | Self-register as developer/tester (status → pending) |
| POST | `/login` | Public | Authenticate, receive JWT |
| GET | `/me` | Any | Current user profile |
| PATCH | `/profile` | Any | Update name and/or avatar (multipart) |
| PATCH | `/password` | Any | Change password |

### POST `/auth/register`
```jsonc
// body
{ "name": "New Dev", "email": "new@x.com", "password": "Passw0rd!", "role": "developer" }
// role ∈ { developer, tester }  — manager/admin cannot self-register
// 201 → { success, message, data: <user> }
```

### POST `/auth/login`
```jsonc
// body
{ "email": "admin@bugshield.com", "password": "Admin@123" }
// 200 → { success, data: { user, token } }
// 403 if account pending/rejected/suspended (message explains which)
```

### PATCH `/auth/profile`
`multipart/form-data`: field `name` (text), field `profilePicture` (image ≤ 2 MB, jpeg/png/gif/webp).
Returns the updated user; `profilePicture` becomes `/uploads/<filename>`.

### PATCH `/auth/password`
```jsonc
{ "currentPassword": "old", "newPassword": "min6chars" }
```

---

## Users — `/api/users`  (admin provisioning)

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | admin, manager | List users; filters: `?role=&status=&search=` |
| GET | `/:id` | admin, manager | Get one user |
| POST | `/` | admin | Create a pre-approved user (e.g. Project Manager) |
| PATCH | `/:id/approve` | admin | Approve a pending user |
| PATCH | `/:id/reject` | admin | Reject (`{ reason }` optional) |
| PATCH | `/:id/suspend` | admin | Suspend an approved user |
| PATCH | `/:id/reactivate` | admin | Re-approve a suspended/rejected user |

### POST `/users`
```jsonc
{ "name": "Priya", "email": "pm@x.com", "password": "Passw0rd!", "role": "manager" }
// role ∈ { manager, developer, tester } — created with status = approved
```
Admin accounts cannot be modified via approve/reject/suspend (guarded in the service).

---

## Projects — `/api/projects`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | Any | List projects (managers see only their own/member projects); `?status=` |
| GET | `/:id` | Any | Project detail incl. manager + members |
| POST | `/` | admin | Create project |
| PUT | `/:id` | admin | Update project (name, dates, category, managerId, status) |
| PATCH | `/:id/archive` | admin | Set status = archived |
| PATCH | `/:id/restore` | admin | Set status = active |
| DELETE | `/:id` | admin | Soft-delete (paranoid) |
| POST | `/:id/members` | admin, manager | Add a team member |
| DELETE | `/:id/members/:userId` | admin, manager | Remove a team member |

### POST `/projects`
```jsonc
{
  "name": "Apollo Web Platform",
  "description": "…",
  "category": "Web Application",
  "startDate": "2026-06-01",   // ISO date, optional
  "deadline": "2026-09-30",    // ISO date, optional
  "managerId": 2               // must reference a user with role=manager, optional
}
```

### POST `/projects/:id/members`
```jsonc
{ "userId": 3, "roleInProject": "developer" }  // roleInProject ∈ { developer, tester, manager }
```
The user must exist and have a matching global role; a notification is sent to the added member.

---

## Bugs — `/api/bugs`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | Any (scoped) | List bugs; filters `?projectId=&status=&severity=` |
| GET | `/:id` | Any | Bug detail (project, reporter, developers, assignment, resolutions) |
| GET | `/:id/history` | Any | Assignment/status history (traceability) |
| GET | `/:id/comments` | Any | Comment thread |
| POST | `/` | tester | Report a new bug |
| PUT | `/:id` | tester, manager, admin | Edit descriptive fields (tester: own reports only) |
| POST | `/:id/assign` | manager, admin | Assign developers + dedicated tester |
| PATCH | `/:id/status` | role-gated (see below) | Advance the lifecycle |
| POST | `/:id/comments` | Any | Add a comment |

**List scoping:** developers see bugs assigned to them; testers see bugs they reported or verify;
managers/admins see all.

### POST `/bugs`  (tester)
```jsonc
{
  "projectId": 1,
  "title": "Login button unresponsive on Safari",
  "description": "…",                 // required
  "stepsToReproduce": "1. …\n2. …",
  "expectedResult": "User logs in",
  "actualResult": "Nothing happens",
  "environment": "Safari 17 / macOS",
  "severity": "high"                  // low | medium | high | critical
}
// 201 → bug with status = "new"
```

### POST `/bugs/:id/assign`  (manager/admin)
```jsonc
{ "developerIds": [3, 4], "testerId": 5 }  // ≥1 developer required; testerId optional
```
Replaces the developer set, upserts the assignment row, moves `new`/`reopened` → `assigned`,
records history, and notifies assignees. Assignees must be members of the bug's project with the
correct role.

### PATCH `/bugs/:id/status`
```jsonc
{ "status": "in_progress" }

// Resolving requires the full report:
{ "status": "resolved",
  "description": "Fixed click handler",
  "rootCause": "Event bound before hydration",
  "codeChangeSummary": "Moved binding into useEffect" }
```

**Allowed transitions** (enforced server-side):

| From | Allowed next | Who may trigger |
|---|---|---|
| new | assigned | manager/admin (via assign) |
| assigned | in_progress, reopened | dev/manager · tester/manager |
| in_progress | resolved | assigned dev / manager (report required) |
| resolved | verified, reopened | tester/reporter/manager |
| verified | closed, reopened | tester/manager |
| reopened | assigned, in_progress | manager · dev/manager |
| closed | — | terminal |

Any other transition returns `400` with the allowed next states.

---

## Notifications — `/api/notifications`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` | Any | Current user's notifications (latest 100) + `meta.unread` |
| PATCH | `/:id/read` | Any | Mark one as read |
| PATCH | `/read-all` | Any | Mark all as read |

Live delivery: the server emits `notification:new` over Socket.io to the recipient's room.

---

## Analytics — `/api/analytics`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/overview` | admin, manager | Counts + `byStatus` + `bySeverity` + resolution rate; `?projectId=` |
| GET | `/projects` | admin, manager | Per-project progress with bug counts |
| GET | `/velocity` | admin, manager | Resolutions per developer |
| GET | `/audit` | admin | Latest 200 audit-log entries |
| GET | `/logins` | admin | Latest 200 login-history entries |

### GET `/analytics/overview` → `data`
```jsonc
{
  "counts": { "totalProjects": 1, "activeProjects": 1, "totalUsers": 6,
              "pendingUsers": 1, "totalBugs": 4, "openBugs": 2, "resolutionRate": 50 },
  "byStatus":   { "new": 1, "assigned": 1, "resolved": 2 },
  "bySeverity": { "low": 0, "medium": 1, "high": 2, "critical": 1 }
}
```

---

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness probe → `{ success, status: "ok", service }` |

---

## WebSocket (Socket.io)

- **URL:** same origin as the API (`/socket.io`), path proxied by Vite in dev.
- **Handshake auth:** `io('/', { auth: { token: <JWT> } })`. Invalid/missing token → connection
  rejected.
- **Rooms:** each client auto-joins `user:<id>`.
- **Server → client events:**

| Event | Payload | When |
|---|---|---|
| `notification:new` | `Notification` row | Any assignment/status/comment/approval/deadline event targeting the user |

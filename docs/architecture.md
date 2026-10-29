# Architecture Overview

BugShield Pro is a **two-tier application**: a stateless REST + WebSocket API backed by MySQL,
and a single-page React client. This document explains how the major pieces fit together.

---

## 1. High-Level Topology

```
┌──────────────────────────┐         HTTPS / WS          ┌──────────────────────────────┐
│      React SPA (Vite)     │  ───────────────────────▶  │     Express API (Node.js)     │
│                           │        /api  (REST)         │                               │
│  AuthContext ─ JWT store  │  ◀───────────────────────  │  Routes → Controllers →       │
│  SocketContext ─ live     │        /socket.io (WS)      │  Services → Sequelize Models  │
│  Tailwind UI + Recharts   │  ◀───── notification:new    │  Socket.io  ·  node-cron      │
└──────────────────────────┘                             └───────────────┬──────────────┘
                                                                          │ SQL
                                                                 ┌────────▼────────┐
                                                                 │     MySQL 8     │
                                                                 └─────────────────┘
```

- **Client** (`client/`): React 18 + Vite dev server on `:5173`, proxying `/api` and `/uploads`
  to the API. Holds the JWT in `localStorage`, opens an authenticated Socket.io connection.
- **API** (`server/`): Express on `:5000`. Layered modules, JWT auth, Sequelize ORM, an
  in-process Socket.io server, and a daily cron job.
- **Database**: MySQL accessed exclusively through Sequelize models.

---

## 2. Backend Layering

Every feature is a **module** under `server/src/modules/<name>/` and follows the same four-layer
pattern. Data flows top-to-bottom on the way in and bottom-to-top on the way out:

```
HTTP request
   │
   ▼
routes.js         Declares paths, attaches middleware chains
   │                (authenticate → authorize → validators → validate → controller)
   ▼
controller.js     Thin HTTP adapter: reads req, calls service, shapes the JSON envelope,
   │                writes an audit log entry. Wrapped in catchAsync.
   ▼
service.js        All business logic + DB access. Throws AppError on rule violations.
   │                Emits notifications. Knows nothing about req/res.
   ▼
models/           Sequelize models + associations. The only place that talks SQL.
```

**Why this split:** controllers stay trivial and uniform; services are independently testable and
reusable (e.g. `bugs.service` calls `projects.service.recomputeProgress`); models centralize the
schema. Cross-cutting concerns live outside the modules in `middleware/`, `utils/`, `services/`,
and `realtime/`.

### Request pipeline (middleware order)

```
helmet → cors → json/urlencoded → morgan → /api router
   → authenticate (JWT verify, load user, block non-approved)
   → authorize(...roles) (role guard)
   → validator chain (express-validator) → validate (collect errors → 400)
   → controller → service
   → notFound (404) → errorHandler (central JSON error shaping)
```

Defined in `server/src/app.js`; the auth/authorize/validate middleware are applied per-route in
each module's `routes.js`.

---

## 3. Major Components

| Component | Location | Responsibility |
|---|---|---|
| **App bootstrap** | `app.js`, `server.js` | Build Express app; connect DB; `sequelize.sync`; start HTTP, Socket.io, and cron |
| **Config** | `config/index.js`, `config/database.js` | Env-driven config object; Sequelize connection |
| **Models** | `models/*.js`, `models/index.js` | 12 entities + associations, wired in one place |
| **Auth** | `modules/auth/` | Register, login, `/me`, profile, password, JWT issuance |
| **Users** | `modules/users/` | Admin provisioning: approve/reject/suspend/create |
| **Projects** | `modules/projects/` | CRUD, archive, soft-delete, team allocation, progress |
| **Bugs** | `modules/bugs/` | Reporting, assignment, lifecycle state machine, comments, history |
| **Notifications** | `modules/notifications/` | List / mark-read endpoints |
| **Analytics** | `modules/analytics/` | Aggregates + audit/login history endpoints |
| **Middleware** | `middleware/` | `authenticate`, `authorize`, `validate`, `upload`, `errorHandler` |
| **Realtime** | `realtime/socket.js` | Socket.io init, JWT handshake, per-user rooms, `emitToUser` |
| **Notification service** | `services/notification.service.js` | Persist a `Notification` **and** push it live |
| **Audit util** | `utils/audit.js` | Best-effort append to `audit_logs` |
| **Cron** | `jobs/deadline.cron.js` | Daily deadline sweep → deadline notifications |
| **Seeder** | `seeders/seed.js` | Reset schema + demo accounts/data |

---

## 4. Authentication & Authorization Flow

```
Register (developer|tester)  ──▶  User row created, status = "pending"
                                        │
Admin approves  ──────────────────────▶ status = "approved"  (+ approval notification)
                                        │
Login  ──▶ bcrypt.compare ──▶ status must be "approved"
        └─▶ sign JWT { id, role }  ·  write LoginHistory  ·  stamp lastLogin
                                        │
Every protected request:
   authenticate → verify JWT → load User → reject unless status === "approved"
   authorize(...roles) → req.user.role must be allowed
```

- **JWT** carries `{ id, role }`, signed with `JWT_SECRET`, `7d` default expiry.
- The **same token** authenticates the Socket.io handshake (`realtime/socket.js`).
- Non-approved accounts (`pending`/`rejected`/`suspended`) are blocked at `authenticate`, so a
  suspended user is locked out immediately on their next request.

Roles: `admin`, `manager`, `developer`, `tester`. See the
[API reference](./api-reference.md) for the role required by each endpoint.

---

## 5. Bug Lifecycle State Machine

The workflow is enforced **server-side** in `modules/bugs/bugLifecycle.js` and mirrored (for UX
only) in `client/src/lib/ui.js`.

```
 new ──▶ assigned ──▶ in_progress ──▶ resolved ──▶ verified ──▶ closed
              │                            │            │
              └──────── reopened ◀─────────┴────────────┘
   reopened ──▶ assigned | in_progress
```

Rules enforced by `bugs.service.changeStatus`:

- **Illegal jumps rejected** — `assertTransition(from, to)` throws `400` for any edge not in the
  transition table (e.g. `new → resolved`).
- **Resolution report mandatory** — moving to `resolved` requires `description`, `rootCause`,
  and `codeChangeSummary`; a `Resolution` row is created.
- **Role-gated transitions** — dev-side moves (`in_progress`, `resolved`) require an assigned
  developer or manager; `verified`/`reopened` require the dedicated tester, the reporter, or a
  manager.
- **Side effects** — each change writes an `AssignmentHistory` row, recomputes project progress,
  and notifies stakeholders.

---

## 6. Real-Time Notifications

```
Service does something noteworthy (assignment, status change, comment, approval, deadline)
        │
        ▼
services/notification.service.notify({ userId, type, message, link })
        │  1. INSERT into notifications
        │  2. emitToUser(userId, "notification:new", payload)
        ▼
realtime/socket.js  ──▶  io.to(`user:<id>`).emit(...)
        ▼
Client SocketContext  ──▶  prepend to list, bump unread badge, toast
```

- On connect, each socket **joins a private room** `user:<id>` keyed by the JWT subject, so
  emits are targeted — no broadcast fan-out.
- Notifications are **persisted first**, so they survive reconnects and are re-fetched via
  `GET /api/notifications` on load.
- `notifyMany(userIds, payload)` deduplicates recipients for multi-stakeholder events.

---

## 7. Scheduled Jobs

`jobs/deadline.cron.js` schedules a daily sweep at **09:00** (`node-cron`, `0 9 * * *`):

1. Find active projects with a `deadline` within the next 3 days (or overdue) → notify the
   manager + all project members.
2. Find open bugs (not resolved/verified/closed) with a `dueDate` in the same window → notify
   assigned developers.

The core function `checkDeadlines()` is exported so it can be invoked directly in tests or a
manual trigger (as done during verification).

---

## 8. Data Model (relationships)

```
User ──< Project (managerId)                 Project ──< Bug ──< Comment
User >──< Project  (ProjectMember join)       Bug ──1 BugAssignment >── User (tester)
Bug  >──< User     (BugDeveloper join)        Bug ──< Resolution >── User (developer)
User ──< Notification                         Bug ──< AssignmentHistory
User ──< LoginHistory                         User ──< AuditLog
```

`User`, `Project`, and `Bug` are **paranoid** (soft-deleted — `deleted_at` set, rows retained for
audit). Full column-level detail is in the [database schema](./database-schema.md).

---

## 9. Frontend Architecture

```
main.jsx
 └─ BrowserRouter
     └─ AuthProvider           (loads /auth/me, exposes user + login/logout)
         └─ SocketProvider     (opens socket when authed, holds notifications)
             └─ App (routes)
                 ├─ /login, /register            (public)
                 └─ ProtectedRoute → Layout      (authenticated shell: sidebar + NotificationBell)
                     ├─ Dashboard  (role-branched: management analytics vs worker task list)
                     ├─ Users, Audit             (admin only)
                     ├─ Projects, ProjectDetail
                     ├─ Bugs, BugDetail          (assignment + lifecycle + comments)
                     └─ Profile
```

- **`api/client.js`**: single axios instance; a request interceptor attaches the JWT, a response
  interceptor normalizes error messages and auto-clears the token on `401`.
- **Role-aware routing**: `ProtectedRoute` redirects unauthenticated users to `/login` and
  wrong-role users to `/`. The sidebar filters nav items by `user.role`.
- **State**: intentionally lightweight — React Context for auth/socket, local component state +
  axios for everything else (no Redux). Suitable for the app's scale.

See the [frontend reference](./frontend-reference.md) for a per-file component guide.

---

## 10. Technology Choices & Rationale

| Choice | Why |
|---|---|
| **Sequelize** | Complex role/assignment relationships and soft-delete are far cleaner with associations + `paranoid` than hand-written SQL |
| **Layered modules** | Uniform, testable, and keeps HTTP concerns out of business logic |
| **Persist-then-emit notifications** | Reliability: nothing is lost if a socket is disconnected |
| **JWT (stateless)** | No server session store; the same token secures REST and WebSocket |
| **Vite + Tailwind** | Fast dev/build and full control over the enterprise dashboard styling |
| **Multer local storage** | Self-contained — no external accounts/keys needed for avatars |

### Production hardening (not yet done)

- Replace `sequelize.sync({ alter })` with versioned **migrations**.
- Store the JWT in an **httpOnly cookie** instead of `localStorage` to reduce XSS exposure.
- Add rate limiting, refresh tokens, and structured logging.
- Serve uploads via object storage / CDN (e.g. swap Multer for Cloudinary).

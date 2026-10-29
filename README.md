# 🛡️ BugShield Pro

**A Role-Segregated Enterprise Bug Tracking & Project Management System** with secure user
provisioning, project governance, and a multi-team assignment framework.

Built with **React (Vite + Tailwind)**, **Node.js/Express**, **MySQL (Sequelize)**,
**Socket.io** real-time notifications, and **node-cron** deadline monitoring.

> 📚 **Full documentation lives in [`/docs`](./docs/README.md)** — architecture, API reference,
> backend/frontend module references, and the database schema. See the
> [Documentation](#documentation) section below.

---

## Features

| Module | Highlights |
|---|---|
| **User Management** | Self-registration (developer/tester), **admin approval workflow**, JWT auth, BCrypt passwords, profile + avatar upload, password change, last-login & login history |
| **Project Management** | Admin CRUD, archive, **soft delete**, assign Project Managers, timelines/deadlines, categories, team allocation, live progress |
| **Assignment Management** | PM assigns **multiple developers** + a **dedicated tester** per bug, reassignment, full assignment history |
| **Tester Portal** | Structured bug report (repro steps, expected/actual, environment, severity), edit own reports, verification tasks |
| **Developer Portal** | Personal task dashboard, assigned-bug queue, **mandatory resolution report** (description, root cause, code-change summary) |
| **Notifications** | Real-time Socket.io push, browser toasts, assignment/status/comment/deadline alerts, notification centre |
| **Audit & Analytics** | Activity log, login history, bug statistics, project progress, team velocity, resolution rate |

### Enforced Bug Lifecycle

```
new → assigned → in_progress → resolved → verified → closed
                                   │           ▲
                                   └▶ reopened ─┘
```

Transitions are validated **server-side** — invalid jumps (e.g. `new → resolved`) are rejected,
and resolving a bug **requires** a full resolution report. Verification/reopen is restricted to
the dedicated tester (or a manager).

---

## Tech Stack

- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Recharts, socket.io-client, react-toastify
- **Backend:** Node.js, Express, Sequelize (mysql2), JWT, BCrypt, Multer, Socket.io, node-cron
- **Database:** MySQL 8

---

## Project Structure

```
Mini_project/
├── server/                     # Express REST API + Socket.io
│   ├── src/
│   │   ├── config/             # env + Sequelize connection
│   │   ├── models/             # Sequelize models + associations
│   │   ├── middleware/         # authenticate, authorize, upload, validate, errors
│   │   ├── modules/            # auth, users, projects, bugs, notifications, analytics
│   │   │   └── <m>/            #   *.routes.js  *.controller.js  *.service.js  *.validators.js
│   │   ├── realtime/socket.js  # Socket.io setup + per-user rooms
│   │   ├── jobs/               # node-cron deadline monitoring
│   │   ├── services/           # notification service
│   │   ├── seeders/seed.js     # demo data + accounts
│   │   ├── app.js  server.js
│   └── uploads/                # profile pictures (local storage)
└── client/                     # React SPA
    └── src/
        ├── context/            # AuthContext, SocketContext
        ├── components/         # Layout, NotificationBell, shared UI
        ├── routes/             # ProtectedRoute (role-aware)
        ├── pages/              # auth, admin, projects, bugs, Dashboard, Profile
        └── api/client.js       # axios + JWT interceptor
```

---

## Prerequisites

- **Node.js** ≥ 18 (tested on 24)
- **MySQL** 8 running locally (e.g. via Laragon/XAMPP)

---

## Getting Started

### 1. Database

Create the database (default name `bugshield_pro`):

```sql
CREATE DATABASE bugshield_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd server
cp .env.example .env          # then edit DB_USER / DB_PASSWORD if needed
npm install
npm run seed                  # creates tables + demo data (resets DB)
npm run dev                   # http://localhost:5000
```

`.env` keys: `PORT`, `CLIENT_URL`, `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and the seed
`ADMIN_*` credentials.

### 3. Frontend

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api` and `/uploads` to the backend, so no client env config is needed.

Open **http://localhost:5173**.

---

## Demo Accounts

Created by `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@bugshield.com` | `Admin@123` |
| Project Manager | `manager@bugshield.com` | `Passw0rd!` |
| Developer | `dev1@bugshield.com` | `Passw0rd!` |
| Developer | `dev2@bugshield.com` | `Passw0rd!` |
| Tester | `tester@bugshield.com` | `Passw0rd!` |

A `pending@bugshield.com` account is seeded in the **pending** state so the admin approval
queue is populated on first login.

---

## Suggested Demo Walkthrough

1. **Admin** logs in → **Users**: approve the pending user; optionally create a Project Manager.
2. **Admin** → **Projects**: create a project and assign a manager.
3. **Manager** logs in → open the project → add developers & a tester to the **team**.
4. **Tester** logs in → **Bugs → Report Bug** using the structured template.
5. **Manager** opens the bug → **Assign Developers / Tester** (multi-select).
6. **Developer** → moves the bug `in_progress` → **Resolved** (resolution report required).
7. **Tester** → **Verify** → **Close**. Watch **real-time toasts** appear for each event.
8. **Admin** → **Dashboard** (charts) and **Audit & Logs** (activity + login history).

---

## API Overview

Base URL: `http://localhost:5000/api` — all protected routes require `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/profile`, `PATCH /auth/password` |
| Users (admin) | `GET /users`, `POST /users`, `PATCH /users/:id/{approve,reject,suspend,reactivate}` |
| Projects | `GET/POST /projects`, `PUT /projects/:id`, `PATCH /projects/:id/{archive,restore}`, `DELETE /projects/:id`, `POST/DELETE /projects/:id/members` |
| Bugs | `GET/POST /bugs`, `GET /bugs/:id`, `PUT /bugs/:id`, `POST /bugs/:id/assign`, `PATCH /bugs/:id/status`, `GET/POST /bugs/:id/comments`, `GET /bugs/:id/history` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Analytics | `GET /analytics/{overview,projects,velocity,audit,logins}` |

See the full [API Reference](./docs/api-reference.md) for request bodies, responses, and roles.

---

## Documentation

Comprehensive docs are in [`/docs`](./docs/README.md):

| Document | Description |
|---|---|
| [Architecture Overview](./docs/architecture.md) | How the components fit together — layering, auth, bug lifecycle, real-time, cron |
| [API Reference](./docs/api-reference.md) | Every endpoint with roles, bodies, responses + the Socket.io contract |
| [Backend Reference](./docs/backend-reference.md) | Services, controllers, middleware, utils, models, jobs |
| [Frontend Reference](./docs/frontend-reference.md) | Contexts, components, pages, routing, API client |
| [Database Schema](./docs/database-schema.md) | Tables, columns, enums, associations |

Contributing? See [CONTRIBUTING.md](./CONTRIBUTING.md) for conventions and workflow.

---

## Notes

- **Security:** JWT auth, BCrypt password hashing, `helmet`, CORS locked to the client origin,
  role-based route guards, and non-approved accounts blocked at authentication.
- **Deadline cron:** runs daily at 09:00; scans active projects and open bugs due within 3 days
  (or overdue) and raises deadline notifications.
- **Soft deletes:** projects, users, and bugs use Sequelize `paranoid` tables — records are
  retained for audit/history.
- For production, replace `sequelize.sync()` with proper migrations and set a strong `JWT_SECRET`.

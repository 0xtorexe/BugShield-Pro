<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=for-the-badge" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white&style=for-the-badge" alt="Express 4" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white&style=for-the-badge" alt="MySQL 8" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white&style=for-the-badge" alt="Socket.io" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Made_by-0xtorexe-blueviolet?style=for-the-badge&logo=github&logoColor=white" alt="Made by 0xtorexe" />
</p>

<h1 align="center">🛡️ BugShield Pro</h1>

<p align="center">
  <strong>Enterprise-Grade Bug Tracking & Project Management</strong><br/>
  Role-based access · Real-time notifications · Enforced bug lifecycle · Analytics dashboards<br/><br/>
  <sub>Designed & developed by <a href="https://github.com/0xtorexe"><strong>@0xtorexe</strong></a></sub>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-reference">API</a> •
  <a href="./docs/README.md">Full Docs</a> •
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | ≥ 18 (tested on 24) |
| **MySQL** | 8.x (e.g. Laragon, XAMPP, Docker) |

### 1 · Create the Database

```sql
CREATE DATABASE bugshield_pro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2 · Start the API Server

```bash
cd server
cp .env.example .env        # ← edit DB_USER / DB_PASSWORD if needed
npm install
npm run seed                 # creates tables + demo data (resets the DB)
npm run dev                  # → http://localhost:5000
```

### 3 · Start the Frontend

```bash
cd client
npm install
npm run dev                  # → http://localhost:5173
```

> Vite proxies `/api` and `/uploads` to the backend — no extra client-side config needed.

Open **http://localhost:5173** and log in with a [demo account](#-demo-accounts).

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 👥 User Management
- Self-registration with **admin approval workflow**
- JWT authentication + BCrypt password hashing
- Profile editing with avatar upload
- Login history & last-login tracking
- Account states: `pending` → `approved` / `rejected` / `suspended`

</td>
<td width="50%">

### 📁 Project Management
- Full CRUD with archive & **soft delete**
- Assign Project Managers & build teams
- Timelines, deadlines & categories
- Auto-computed progress from bug states
- Team allocation dashboard

</td>
</tr>
<tr>
<td>

### 🐛 Bug Tracking & Lifecycle
- Structured reports: repro steps, environment, severity
- **Multi-developer** assignment + dedicated tester
- Server-enforced state machine (see [lifecycle](#-bug-lifecycle))
- Mandatory resolution reports (root cause + code summary)
- Full assignment & status change history

</td>
<td>

### 🔔 Real-Time Notifications
- **Socket.io** push + browser toasts
- Assignment, status, comment & deadline alerts
- Notification centre with read/unread state
- Persisted first — survive disconnects

</td>
</tr>
<tr>
<td>

### 📊 Analytics & Audit
- Bug statistics (by severity, status, project)
- Team velocity & resolution rate charts
- Project progress tracking
- Activity audit log & login history

</td>
<td>

### 🔒 Security
- Helmet, CORS locked to client origin
- Role-based route guards (`admin`, `manager`, `developer`, `tester`)
- Non-approved accounts blocked at authentication
- Soft deletes for data retention & compliance

</td>
</tr>
</table>

---

## 🔄 Bug Lifecycle

Status transitions are validated **server-side** — invalid jumps are rejected with `400`, and resolving a bug **requires** a complete resolution report.

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │   new ──▶ assigned ──▶ in_progress ──▶ resolved ──▶ verified ──▶ closed │
 │                                            │            │                │
 │                                            ▼            │                │
 │                                        reopened ◀───────┘                │
 │                                         │    │                           │
 │                                         │    └──▶ in_progress            │
 │                                         └──────▶ assigned                │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘
```

| Transition | Who Can Do It | Requirement |
|---|---|---|
| `new` → `assigned` | Manager | Assign developers + tester |
| `assigned` → `in_progress` | Assigned developer, Manager | — |
| `in_progress` → `resolved` | Assigned developer, Manager | **Resolution report** (description, root cause, code changes) |
| `resolved` → `verified` | Dedicated tester, Reporter, Manager | — |
| `verified` → `closed` | Dedicated tester, Reporter, Manager | — |
| `*` → `reopened` | Dedicated tester, Reporter, Manager | — |

---

## 🏗️ Architecture

```
┌────────────────────────────┐       REST / WebSocket       ┌──────────────────────────────────┐
│     React SPA (Vite)       │  ◀═══════════════════════▶   │      Express API (Node.js)       │
│                            │        /api  (REST)          │                                  │
│  AuthContext  → JWT store  │        /socket.io (WS)       │  Routes → Controllers →          │
│  SocketContext → live push │                              │  Services → Sequelize Models     │
│  Tailwind + Recharts       │                              │  Socket.io  ·  node-cron         │
└────────────────────────────┘                              └──────────────┬───────────────────┘
                                                                           │ SQL
                                                                  ┌────────▼────────┐
                                                                  │    MySQL 8      │
                                                                  └─────────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Recharts, Lucide Icons, Socket.io Client, React Toastify |
| **Backend** | Node.js, Express 4, Sequelize 6 (MySQL2), JWT, BCrypt, Multer, Socket.io 4, node-cron, Helmet, Morgan |
| **Database** | MySQL 8 — 12 tables with associations, paranoid (soft-delete) support |

### Backend Layering

Every feature module follows the same four-layer pattern:

```
HTTP request
   │
   ▼
routes.js           Paths + middleware chains (authenticate → authorize → validate)
   │
   ▼
controller.js       Thin HTTP adapter — reads req, calls service, shapes response + audit
   │
   ▼
service.js          Business logic + DB access — throws AppError, emits notifications
   │
   ▼
models/             Sequelize models + associations — the only layer that touches SQL
```

---

## 📂 Project Structure

```
BugShield-Pro/
├── client/                          # React SPA
│   ├── src/
│   │   ├── api/client.js            # Axios instance + JWT interceptor
│   │   ├── components/              # Layout, NotificationBell, shared UI
│   │   ├── context/                 # AuthContext, SocketContext
│   │   ├── lib/                     # UI helpers (style maps, utils)
│   │   ├── pages/                   # Auth, Dashboard, Admin, Projects, Bugs, Profile
│   │   └── routes/                  # ProtectedRoute (role-aware)
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # Express REST API + Socket.io
│   ├── src/
│   │   ├── config/                  # Env + Sequelize connection
│   │   ├── middleware/              # authenticate, authorize, upload, validate, errorHandler
│   │   ├── models/                  # 12 Sequelize models + associations
│   │   ├── modules/                 # Feature modules (see layering above)
│   │   │   ├── auth/                # Register, login, profile, password
│   │   │   ├── users/               # Admin user management (approve/reject/suspend)
│   │   │   ├── projects/            # CRUD, archive, soft-delete, team allocation
│   │   │   ├── bugs/                # Reporting, lifecycle, assignment, comments, history
│   │   │   ├── notifications/       # List + mark-read
│   │   │   └── analytics/           # Overview, velocity, audit, logins
│   │   ├── realtime/socket.js       # Socket.io setup + per-user rooms
│   │   ├── jobs/deadline.cron.js    # Daily deadline sweep (node-cron)
│   │   ├── services/               # Notification persistence + push
│   │   ├── seeders/seed.js          # Demo data
│   │   └── utils/                   # AppError, catchAsync, audit logger
│   └── uploads/                     # Avatar storage (local)
│
├── docs/                            # Comprehensive documentation
│   ├── architecture.md
│   ├── api-reference.md
│   ├── backend-reference.md
│   ├── frontend-reference.md
│   ├── database-schema.md
│   ├── DFD.md
│   └── ER-diagram.md
│
├── CONTRIBUTING.md
├── LICENSE                          # MIT
└── spec.md                          # Original project specification
```

---

## 🌐 API Reference

Base URL: `http://localhost:5000/api` — all protected routes require `Authorization: Bearer <token>`.

<details>
<summary><strong>🔐 Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register (developer/tester) — enters pending state |
| `POST` | `/auth/login` | Login → JWT token |
| `GET` | `/auth/me` | Get current user profile |
| `PATCH` | `/auth/profile` | Update profile (name, avatar) |
| `PATCH` | `/auth/password` | Change password |

</details>

<details>
<summary><strong>👤 User Management</strong> (Admin)</summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users |
| `POST` | `/users` | Create a user directly |
| `PATCH` | `/users/:id/approve` | Approve pending user |
| `PATCH` | `/users/:id/reject` | Reject pending user |
| `PATCH` | `/users/:id/suspend` | Suspend active user |
| `PATCH` | `/users/:id/reactivate` | Reactivate suspended user |

</details>

<details>
<summary><strong>📁 Projects</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects` | List projects (role-filtered) |
| `POST` | `/projects` | Create project (admin) |
| `PUT` | `/projects/:id` | Update project |
| `PATCH` | `/projects/:id/archive` | Archive project |
| `PATCH` | `/projects/:id/restore` | Restore archived project |
| `DELETE` | `/projects/:id` | Soft-delete project |
| `POST` | `/projects/:id/members` | Add team member |
| `DELETE` | `/projects/:id/members` | Remove team member |

</details>

<details>
<summary><strong>🐛 Bugs</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bugs` | List bugs (role & project filtered) |
| `POST` | `/bugs` | Report a new bug |
| `GET` | `/bugs/:id` | Bug detail (with assignments, comments, history) |
| `PUT` | `/bugs/:id` | Update bug fields |
| `POST` | `/bugs/:id/assign` | Assign developers + tester |
| `PATCH` | `/bugs/:id/status` | Change status (lifecycle enforced) |
| `GET` | `/bugs/:id/comments` | List comments |
| `POST` | `/bugs/:id/comments` | Add comment |
| `GET` | `/bugs/:id/history` | Assignment & status history |

</details>

<details>
<summary><strong>🔔 Notifications</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | List user's notifications |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |

</details>

<details>
<summary><strong>📊 Analytics</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/overview` | Bug counts by status & severity |
| `GET` | `/analytics/projects` | Per-project progress & stats |
| `GET` | `/analytics/velocity` | Team resolution velocity |
| `GET` | `/analytics/audit` | Activity audit log |
| `GET` | `/analytics/logins` | Login history |

</details>

> 📖 See the full [API Reference](./docs/api-reference.md) for request bodies, responses, and role requirements.

---

## 🧪 Demo Accounts

Seeded by `npm run seed` — use these to explore every role:

| Role | Name | Email | Password |
|------|------|-------|----------|
| 🔴 **Administrator** | System Administrator | `admin@bugshield.com` | `Admin@123` |
| 🟡 **Project Manager** | Priya Manager | `manager@bugshield.com` | `Passw0rd!` |
| 🟢 **Developer** | Dinesh Developer | `dev1@bugshield.com` | `Passw0rd!` |
| 🟢 **Developer** | Deepa Developer | `dev2@bugshield.com` | `Passw0rd!` |
| 🔵 **Tester** | Tara Tester | `tester@bugshield.com` | `Passw0rd!` |

> A `pending@bugshield.com` account is also seeded so the admin approval queue is populated on first login.

### Suggested Walkthrough

1. **Admin** → Log in → **Users**: approve the pending user  
2. **Admin** → **Projects**: create a project, assign a manager  
3. **Manager** → Open the project → add developers & a tester to the team  
4. **Tester** → **Bugs → Report Bug**: use the structured template  
5. **Manager** → Open the bug → **Assign** developers + tester  
6. **Developer** → Move bug to `in_progress` → `resolved` (resolution report required)  
7. **Tester** → **Verify** → **Close** — watch real-time toasts fire for each event  
8. **Admin** → **Dashboard** (charts) + **Audit & Logs** (activity + login history)

---

## ⏰ Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| **Deadline Monitor** | Daily at `09:00` | Scans active projects and open bugs due within 3 days (or overdue). Notifies managers, team members, and assigned developers. |

The cron job is powered by `node-cron` and the core `checkDeadlines()` function is exported for manual invocation or testing.

---

## 📚 Documentation

Comprehensive documentation lives in [`/docs`](./docs/README.md):

| Document | Description |
|----------|-------------|
| [Architecture Overview](./docs/architecture.md) | System topology, layering, auth flow, state machine, real-time, cron |
| [API Reference](./docs/api-reference.md) | Every endpoint — roles, request bodies, responses, Socket.io events |
| [Backend Reference](./docs/backend-reference.md) | Services, controllers, middleware, utils, models, jobs |
| [Frontend Reference](./docs/frontend-reference.md) | Contexts, components, pages, routing, API client |
| [Database Schema](./docs/database-schema.md) | Tables, columns, enums, associations |
| [DFD](./docs/DFD.md) | Data Flow Diagrams |
| [ER Diagram](./docs/ER-diagram.md) | Entity-Relationship model |

---

## 🔐 Security Considerations

| Area | Implementation |
|------|---------------|
| **Authentication** | JWT with configurable expiry, BCrypt password hashing |
| **Authorization** | Role-based middleware guards on every route |
| **HTTP Hardening** | Helmet headers, CORS restricted to client origin |
| **Account Control** | Admin approval workflow, suspension capability |
| **Data Integrity** | Sequelize paranoid tables — soft deletes retain records for audit |
| **Input Validation** | express-validator chains + centralized validation middleware |

### Production Hardening (Roadmap)

- [ ] Replace `sequelize.sync()` with versioned **migrations**
- [ ] Store JWT in **httpOnly cookies** (reduce XSS surface)
- [ ] Add **rate limiting** and **refresh tokens**
- [ ] Move file uploads to object storage / CDN (e.g. Cloudinary)
- [ ] Add structured logging (Winston / Pino)
- [ ] Implement automated test suite

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development workflow & branching conventions
- Commit message format (Conventional Commits)
- Backend/frontend coding conventions
- How to add a new module
- PR checklist

> **Security vulnerabilities:** Please report privately — do not open a public issue.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <sub>© 2026 <a href="https://github.com/0xtorexe"><strong>0xtorexe</strong></a> using React, Express & MySQL</sub>
</p>

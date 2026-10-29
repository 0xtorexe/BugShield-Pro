# Data Flow Diagram — BugShield Pro

> Enterprise Bug Tracking & Project Management System
> Stack: React · Express · MySQL (Sequelize) · Socket.io · node-cron
> Data Stores: 12 tables (see `database-schema.md`) · Roles: `admin` / `manager` / `developer` / `tester`

---

## 1. Overview

BugShield Pro centralizes user provisioning, project governance, bug lifecycle, multi-team assignment, real-time notifications and audit analytics into one system.

**External Entities**

| Entity | Role |
|---|---|
| `Unauthenticated User` | Registers as developer/tester |
| `Administrator` | Approves users, creates projects, assigns managers, views audit/analytics |
| `Project Manager` | Manages team, assigns bugs, monitors progress |
| `Developer` | Resolves assigned bugs, submits resolution reports |
| `Tester` | Reports bugs with structured template, verifies fixes |
| `Scheduler (node-cron)` | Daily 09:00 deadline sweep |
| `Browser / Client` | Receives Socket.io pushes & toasts |

**Data Stores (MySQL)**

`D1 Users` · `D2 Projects` · `D3 ProjectMembers` · `D4 Bugs` · `D5 BugAssignments` · `D6 BugDevelopers` · `D7 Resolutions` · `D8 Comments` · `D9 Notifications` · `D10 AuditLogs` · `D11 LoginHistory` · `D12 AssignmentHistory` + `File Store /uploads` for avatars

---

## 2. Level 0 — Context Diagram

System as single process. All roles interact via React SPA → Express REST API (`/api`) and Socket.io (`/socket.io`).

```mermaid
flowchart LR
    U0[Unauthenticated User]
    AD[Administrator]
    PM[Project Manager]
    DEV[Developer]
    TE[Tester]
    CRON[[Scheduler<br/>node-cron 09:00]]

    P0((0 BugShield Pro<br/>System))

    DB[(MySQL<br/>+ /uploads)]

    U0 -- "1. Register (name,email,pass,role)" --> P0
    P0 -- "1b. Pending notification" --> AD
    AD -- "2. Approve/Reject/Suspend" --> P0
    P0 -- "3a. Create Project + Assign Manager" --> AD
    AD -- "3b. JWT Auth / Login" --> P0
    PM -- "4. Allocate team, Assign bugs" --> P0
    TE -- "5. Report / Verify bugs" --> P0
    DEV -- "6. Update status, Submit resolution" --> P0
    P0 -- "7. Real-time notification:new<br/>(Socket.io)" --> AD & PM & DEV & TE
    P0 -- "8. Analytics / Audit read" --> AD
    P0 -- "9. Dashboard / Project / Bug reads" --> PM & DEV & TE
    CRON -- "10. checkDeadlines()" --> P0
    P0 <--> DB
```

**Key Flows at Level 0**

| # | Flow | Direction | Payload |
|---|---|---|---|
| F1 | Registration | User → System | `name, email, password, role=dev/tester` → D1 (status=pending) + D10 |
| F2 | Approval | Admin → System | `approve/reject` → D1 status=approved, D11, notify |
| F3 | Login | Any → System | `email, password` → verify bcrypt → JWT + D11 + stamp last_login |
| F4 | Project Ops | Admin → System | `name, desc, category, deadline, managerId` → D2 + D3 |
| F5 | Bug Report | Tester → System | `projectId, title, severity, repro steps...` → D4 (status=new) + D12 |
| F6 | Assignment | Manager → System | `developerIds[], testerId` → D5 + D6 + D12 |
| F7 | Status Change | Dev/Tester → System | `status + Resolution{desc,rootCause,codeSummary}` → D4 + D7 + D12 |
| F8 | Comment | Any member → System | `bugId, content` → D8 |
| F9 | Notifications | System → Users | persist D9 + `emitToUser(userId, notification:new)` via Socket.io |
| F10 | Deadline Alerts | Cron → System | scan D2/D4 due within 3d or overdue → D9 |

---

## 3. Level 1 — System Decomposition

```mermaid
flowchart TB
    %% External Entities
    UA([Unauthenticated])
    AD([Administrator])
    PM([Project Manager])
    DEV([Developer])
    TE([Tester])
    CRON[[Cron Job]]

    %% Processes
    P1((1.0 Auth &<br/>User Management))
    P2((2.0 Project<br/>Management))
    P3((3.0 Bug Management<br/>& Lifecycle))
    P4((4.0 Assignment<br/>Management))
    P5((5.0 Comments &<br/>Collaboration))
    P6((6.0 Notification<br/>System))
    P7((7.0 Audit &<br/>Analytics))

    %% Data Stores
    D1[(D1 Users)]
    D2[(D2 Projects)]
    D3[(D3 ProjectMembers)]
    D4[(D4 Bugs)]
    D5[(D5 BugAssignments)]
    D6[(D6 BugDevelopers)]
    D7[(D7 Resolutions)]
    D8[(D8 Comments)]
    D9[(D9 Notifications)]
    D10[(D10 AuditLogs)]
    D11[(D11 LoginHistory)]
    D12[(D12 AssignmentHistory)]

    UA -- register --> P1
    P1 -- pending user --> D1
    P1 -- audit --> D10
    AD -- approve/reject/suspend --> P1
    P1 -- approval notify --> P6
    P1 -- login --> D1
    P1 -- login history --> D11
    P1 -- JWT --> AD & PM & DEV & TE

    AD -- create/edit/archive/delete --> P2
    P2 <--> D2
    P2 <--> D3
    P2 -- audit --> D10
    P2 -- progress --> D2
    PM -- add/remove members --> P2

    TE -- report bug --> P3
    P3 --> D4
    P3 --> D12
    DEV & TE & PM -- status change --> P3
    P3 <--> D7
    P3 -- recomputeProgress --> P2
    P3 -- status notify --> P6
    P3 -- audit --> D10

    PM -- assign devs/tester --> P4
    P4 <--> D5
    P4 <--> D6
    P4 --> D12
    P4 --> P6

    DEV & TE & PM -- comment --> P5
    P5 <--> D8
    P5 --> P6
    P5 --> D10

    P6 <--> D9
    P6 -- socket emit --> AD & PM & DEV & TE

    P1 & P2 & P3 & P4 & P5 --> P7
    P7 <--> D10
    P7 <--> D11
    P7 <--> D12
    P7 --> AD

    CRON --> P6
    CRON -- scan --> D2 & D4

    P1 & P2 & P3 & P4 & P5 & P7 -- read/write --> D1
```

### Process Descriptions

| Process | Responsibility | Controllers / Services |
|---|---|---|
| **1.0 Auth & User Mgmt** | Register (pending), JWT login, profile/pwd, admin approve/reject/suspend/create, avatar upload (Multer→/uploads) | `modules/auth`, `modules/users`, `middleware/authenticate, authorize` |
| **2.0 Project Mgmt** | CRUD, archive/restore, soft-delete (paranoid), assign manager, team allocation, progress cache, deadline | `modules/projects/projects.service` + `Project`, `ProjectMember` |
| **3.0 Bug Mgmt** | Report (tester), edit, state-machine `assertTransition()`, mandatory Resolution on `resolved`, verify/reopen/close, history | `modules/bugs/bugLifecycle.js` + `Bug`, `Resolution`, `AssignmentHistory` |
| **4.0 Assignment Mgmt** | PM assigns N developers + 1 tester per bug, reassignment, traceability | `BugAssignment`, `BugDeveloper` |
| **5.0 Comments** | Thread per bug, notify stakeholders | `Comment` |
| **6.0 Notification** | `notify({userId,type,message,link})` → INSERT D9 + `emitToUser(user:ID)`; `notifyMany()` deduped; Cron deadline alerts | `services/notification.service.js` + `realtime/socket.js` |
| **7.0 Audit & Analytics** | Append-only logs, login history, bug stats, velocity, progress, resolution rate | `utils/audit.js` + `modules/analytics` |

---

## 4. Level 2 — Detailed DFDs

### 4.1 User Registration & Approval (Decomposition of 1.0)

```mermaid
flowchart LR
    subgraph P1 [1.0 Auth & User Management]
        direction TB
        A1((1.1 Register))
        A2((1.2 Authenticate<br/>Login))
        A3((1.3 Approve / Reject<br/>Suspend))
        A4((1.4 Profile &<br/>Password))
    end
    U([User]) -- "POST /auth/register" --> A1 --> D1[(D1 Users<br/>status=pending)]
    A1 --> D10[(D10 AuditLogs)]
    A1 --> N1((6.0 Notify)) -- approval needed --> AD([Admin])
    AD -- "PATCH /users/:id/approve" --> A3 --> D1
    A3 --> N1
    U -- "POST /auth/login" --> A2 --> D1
    A2 -- success --> D11[(D11 LoginHistory)]
    A2 -- JWT --> U
    U -- "PATCH /auth/profile, /password" --> A4 --> D1
```

### 4.2 Bug Lifecycle (Decomposition of 3.0 + 4.0)

```mermaid
flowchart TB
    TE([Tester]) -- "POST /bugs" --> B1((3.1 Report Bug))
    B1 --> D4[(D4 Bugs<br/>status=new)]
    B1 --> D12[(D12 AssignmentHistory<br/>action=reported)]
    PM([Manager]) -- "POST /bugs/:id/assign<br/>devIds[], testerId" --> B2((4.1 Assign Teams))
    B2 --> D5[(D5 BugAssignments)]
    B2 --> D6[(D6 BugDevelopers)]
    B2 --> D4
    B2 --> N((6.0 Notification))
    DEV([Developer]) -- "PATCH /bugs/:id/status<br/>in_progress → resolved<br/>+ Resolution report" --> B3((3.2 Change Status))
    B3 -- "assertTransition()" --> D4
    B3 --> D7[(D7 Resolutions)]
    B3 --> D12
    B3 --> N
    TE -- "verified / reopened / closed" --> B3
    B3 -- "recomputeProgress()" --> P2((2.0 Project<br/>progress 0-100))
    P2 --> D2[(D2 Projects)]
```

**Enforced State Machine** (`bugLifecycle.js`)

```
new → assigned → in_progress → resolved → verified → closed
                 │                │           │
                 └── reopened ◀──┴───────────┘   reopened → assigned | in_progress
```

Illegal jumps (e.g. `new→resolved`) rejected `400`; `verified/reopened` restricted to dedicated tester/reporter/manager.

### 4.3 Notification & Deadline Cron (Decomposition of 6.0)

```mermaid
flowchart LR
    Svc[Service Event<br/>assignment / status / comment / approval] --> NS((6.1 notify))
    NS --> D9[(D9 Notifications<br/>is_read=false)]
    NS --> Sock[realtime/socket.js<br/>io.to user:ID .emit<br/>notification:new]
    Sock --> Client([Browser<br/>SocketContext<br/>toast + badge])

    CRON[[Cron 0 9 * * *]] --> SCAN((6.2 checkDeadlines))
    SCAN -- "deadline within 3d or overdue" --> D2[(D2 Projects)] & D4[(D4 Bugs)]
    SCAN --> NS
```

---

## 5. Data Flow Dictionary (Level 1)

| Flow | Source → Dest | Data |
|---|---|---|
| `Credentials` | Client → 1.0 | `email, password` |
| `JWT` | 1.0 → Client | `Bearer <token {id,role}>` + Socket handshake |
| `Project Data` | Admin → 2.0 | `name, description, category, startDate, deadline, managerId` |
| `Team Data` | PM → 2.0/4.0 | `projectId, userIds[], roleInProject` |
| `Bug Report` | Tester → 3.0 | `projectId, title, description, steps, expected, actual, env, severity, dueDate` |
| `Resolution Report` | Developer → 3.0 | `description, rootCause, codeChangeSummary` (mandatory for resolved) |
| `Assignment Payload` | PM → 4.0 | `bugId, developerIds[], testerId, assignedBy` |
| `Comment` | Any → 5.0 | `bugId, content` |
| `Notification` | 6.0 → User | `{type, message, link, isRead}` persisted + Socket push |
| `Audit Entry` | All → 7.0 | `{userId, action, entityType, entityId, details, ip_address}` |

---

## 6. Trust Boundaries & Security Flows

- `authenticate` middleware verifies JWT, loads `User`, blocks `status !== approved` (pending/rejected/suspended → 401/403).
- `authorize(...roles)` gates every route (e.g. `POST /projects` admin-only, `POST /bugs` tester-only, `PATCH /bugs/:id/status` dev/tester/manager with assignment check).
- Passwords stored as `password_hash` (BCrypt), never returned in JSON.
- `helmet`, CORS locked to `CLIENT_URL`, Multer file filter for avatars.

---

*Generated for BugShield Pro · Levels 0-2 · Mermaid.js compatible — render in GitHub, VS Code or docsify.*

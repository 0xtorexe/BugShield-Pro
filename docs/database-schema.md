# Database Schema

MySQL 8 via Sequelize. Table/column names are `snake_case` (`underscored: true`); models use
`camelCase`. Unless noted, every table has `id` (PK, auto-increment), `created_at`, and
`updated_at`.

Legend: **PK** primary key · **FK** foreign key · **paranoid** soft delete (`deleted_at`).

---

## users  *(paranoid)*

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| name | VARCHAR(120) | required |
| email | VARCHAR(160) | required, **unique**, validated |
| password_hash | VARCHAR(255) | bcrypt; stripped from JSON |
| role | ENUM | `admin` \| `manager` \| `developer` \| `tester` |
| status | ENUM | `pending` \| `approved` \| `rejected` \| `suspended` (default `pending`) |
| profile_picture | VARCHAR(255) | `/uploads/…` or null |
| last_login | DATETIME | stamped on login |
| approved_by | INT | admin user id (nullable) |
| rejected_reason | VARCHAR(255) | nullable |
| deleted_at | DATETIME | soft delete |

---

## projects  *(paranoid)*

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| name | VARCHAR(160) | required |
| description | TEXT | nullable |
| category | VARCHAR(80) | nullable |
| status | ENUM | `active` \| `archived` (default `active`) |
| start_date | DATE | nullable |
| deadline | DATE | nullable; scanned by the cron job |
| progress | INT | 0–100, cached from bug states |
| manager_id | INT | FK → users |
| created_by | INT | FK → users |
| deleted_at | DATETIME | soft delete |

---

## project_members

Team allocation join between users and projects.

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| project_id | INT | FK → projects |
| user_id | INT | FK → users |
| role_in_project | ENUM | `manager` \| `developer` \| `tester` |

**Unique** `(project_id, user_id)`.

---

## bugs  *(paranoid)*

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| project_id | INT | FK → projects, required |
| title | VARCHAR(200) | required |
| description | TEXT | required |
| steps_to_reproduce | TEXT | nullable |
| expected_result | TEXT | nullable |
| actual_result | TEXT | nullable |
| environment | VARCHAR(255) | nullable |
| severity | ENUM | `low` \| `medium` \| `high` \| `critical` (default `medium`) |
| status | ENUM | `new` \| `assigned` \| `in_progress` \| `resolved` \| `verified` \| `reopened` \| `closed` |
| reporter_id | INT | FK → users (tester), required |
| due_date | DATE | nullable; scanned by the cron job |
| deleted_at | DATETIME | soft delete |

---

## bug_assignments

One row per bug: the dedicated tester and who assigned it. (Developers are separate — see below.)

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| bug_id | INT | FK → bugs, **unique** |
| tester_id | INT | FK → users (nullable) |
| assigned_by | INT | FK → users, required |

---

## bug_developers

Join enabling **multiple developers** per bug.

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| bug_id | INT | FK → bugs |
| developer_id | INT | FK → users |

**Unique** `(bug_id, developer_id)`.

---

## resolutions

Mandatory report captured when a bug moves to `resolved`.

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| bug_id | INT | FK → bugs |
| developer_id | INT | FK → users |
| description | TEXT | required |
| root_cause | TEXT | required |
| code_change_summary | TEXT | required |

---

## comments

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| bug_id | INT | FK → bugs |
| user_id | INT | FK → users (author) |
| content | TEXT | required |

---

## notifications

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| user_id | INT | FK → users (recipient) |
| type | ENUM | `assignment` \| `status` \| `comment` \| `deadline` \| `approval` \| `system` |
| message | VARCHAR(255) | required |
| link | VARCHAR(255) | client route (nullable) |
| is_read | BOOLEAN | default false |

---

## audit_logs  *(append-only)*

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| user_id | INT | FK → users (actor, nullable) |
| action | VARCHAR(120) | e.g. `bug.status`, `user.approve` |
| entity_type | VARCHAR(60) | e.g. `Bug`, `Project` (nullable) |
| entity_id | INT | nullable |
| details | JSON | arbitrary context (nullable) |
| ip_address | VARCHAR(60) | captured from request |
| created_at | DATETIME | (no `updated_at`) |

---

## login_history

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| user_id | INT | FK → users |
| login_at | DATETIME | defaults to now |
| ip_address | VARCHAR(60) | nullable |
| user_agent | VARCHAR(255) | nullable |

*(no created/updated timestamps)*

---

## assignment_history  *(append-only)*

Traceability for every assignment/status change on a bug.

| Column | Type | Notes |
|---|---|---|
| id | INT | PK |
| bug_id | INT | FK → bugs |
| action | VARCHAR(120) | `reported` \| `assigned` \| `status_change` |
| changed_by | INT | FK → users (nullable) |
| old_value | VARCHAR(255) | nullable |
| new_value | VARCHAR(255) | nullable |
| created_at | DATETIME | (no `updated_at`) |

---

## Associations (Sequelize)

```
User  1───∞ Project            (managerId)          as manager / managedProjects
User  1───∞ Project            (createdBy)          as creator
User ∞───∞ Project  through ProjectMember           as members / projects
Project 1───∞ Bug                                    as bugs / project
User  1───∞ Bug                (reporterId)         as reporter
Bug  1───1 BugAssignment                             as assignment
BugAssignment ∞───1 User       (testerId)           as tester
BugAssignment ∞───1 User       (assignedBy)         as assigner
Bug ∞───∞ User     through BugDeveloper              as developers / assignedBugs
Bug  1───∞ Resolution                                as resolutions
Bug  1───∞ Comment                                   as comments
User  1───∞ Notification                             as notifications
User  1───∞ AuditLog / LoginHistory
Bug  1───∞ AssignmentHistory
```

Defined in `server/src/models/index.js`.

---

## Schema management

- Development uses `sequelize.sync({ alter: true })` on boot to reconcile tables to the models.
- `npm run seed` runs `sync({ force: true })` — **drops and recreates all tables**, then loads
  demo data.
- For production, replace sync with versioned migrations (e.g. `sequelize-cli`).

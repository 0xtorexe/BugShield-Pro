# ER Diagram — BugShield Pro

> MySQL 8 · Sequelize ORM · `snake_case` columns (`underscored:true`), `camelCase` models
> 12 tables · 3 paranoid (soft-delete) · Enums for role/status/severity/type
> Source: `server/src/models/` + `docs/database-schema.md`

---

## 1. Conceptual ER Diagram

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "manages (managerId)"
    USERS ||--o{ PROJECTS : "creates (createdBy)"
    USERS ||--o{ PROJECT_MEMBERS : "belongs"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has team"
    PROJECTS ||--o{ BUGS : "contains"
    USERS ||--o{ BUGS : "reports (reporterId)"
    BUGS ||--|| BUG_ASSIGNMENTS : "has assignment"
    BUG_ASSIGNMENTS }o--|| USERS : "tester (testerId)"
    BUG_ASSIGNMENTS }o--|| USERS : "assigner (assignedBy)"
    BUGS ||--o{ BUG_DEVELOPERS : "assigned devs"
    USERS ||--o{ BUG_DEVELOPERS : "works on"
    BUGS ||--o{ RESOLUTIONS : "has"
    USERS ||--o{ RESOLUTIONS : "authors (developerId)"
    BUGS ||--o{ COMMENTS : "has"
    USERS ||--o{ COMMENTS : "authors"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "performs"
    USERS ||--o{ LOGIN_HISTORY : "logins"
    BUGS ||--o{ ASSIGNMENT_HISTORY : "trace"
    USERS ||--o{ ASSIGNMENT_HISTORY : "changedBy"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "admin|manager|developer|tester"
        enum status "pending|approved|rejected|suspended"
        string profile_picture
        datetime last_login
        int approved_by FK
        string rejected_reason
        datetime deleted_at "paranoid"
    }
    PROJECTS {
        int id PK
        string name
        text description
        string category
        enum status "active|archived"
        date start_date
        date deadline
        int progress "0-100"
        int manager_id FK
        int created_by FK
        datetime deleted_at "paranoid"
    }
    PROJECT_MEMBERS {
        int id PK
        int project_id FK
        int user_id FK
        enum role_in_project "manager|developer|tester"
    }
    BUGS {
        int id PK
        int project_id FK
        string title
        text description
        text steps_to_reproduce
        text expected_result
        text actual_result
        string environment
        enum severity "low|medium|high|critical"
        enum status "new|assigned|in_progress|resolved|verified|reopened|closed"
        int reporter_id FK
        date due_date
        datetime deleted_at "paranoid"
    }
    BUG_ASSIGNMENTS {
        int id PK
        int bug_id FK_UK
        int tester_id FK
        int assigned_by FK
    }
    BUG_DEVELOPERS {
        int id PK
        int bug_id FK
        int developer_id FK
    }
    RESOLUTIONS {
        int id PK
        int bug_id FK
        int developer_id FK
        text description
        text root_cause
        text code_change_summary
    }
    COMMENTS {
        int id PK
        int bug_id FK
        int user_id FK
        text content
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        enum type "assignment|status|comment|deadline|approval|system"
        string message
        string link
        boolean is_read
    }
    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity_type
        int entity_id
        json details
        string ip_address
    }
    LOGIN_HISTORY {
        int id PK
        int user_id FK
        datetime login_at
        string ip_address
        string user_agent
    }
    ASSIGNMENT_HISTORY {
        int id PK
        int bug_id FK
        string action "reported|assigned|status_change"
        int changed_by FK
        string old_value
        string new_value
    }
```

> Tip: View in GitHub / VS Code Mermaid preview. `||` = one, `}o` = many.

---

## 2. Logical Schema & Cardinalities

| Relationship | Type | Join / FK | Notes |
|---|---|---|---|
| User → Project (manager) | 1 : N | `projects.manager_id → users.id` | `as: manager / managedProjects` |
| User → Project (creator) | 1 : N | `projects.created_by → users.id` | `as: creator` |
| User ↔ Project (team) | M : N | `project_members` (project_id, user_id) UK | `as: members / projects`; `role_in_project` enum |
| Project → Bug | 1 : N | `bugs.project_id` | `as: bugs / project` |
| User → Bug (reporter) | 1 : N | `bugs.reporter_id` | tester who reported |
| Bug → BugAssignment | 1 : 1 | `bug_assignments.bug_id` UK | one dedicated tester row per bug |
| BugAssignment → User (tester) | N : 1 | `bug_assignments.tester_id` | nullable until assigned |
| BugAssignment → User (assigner) | N : 1 | `bug_assignments.assigned_by` | PM/manager who assigned |
| Bug ↔ User (developers) | M : N | `bug_developers` (bug_id, developer_id) UK | multiple devs per bug |
| Bug → Resolution | 1 : N | `resolutions.bug_id` | mandatory fields on `resolved` |
| Resolution → User | N : 1 | `resolutions.developer_id` | authoring developer |
| Bug → Comment | 1 : N | `comments.bug_id` | `comments.user_id` = author |
| User → Notification | 1 : N | `notifications.user_id` | recipient, `is_read` default false |
| User → AuditLog | 1 : N | `audit_logs.user_id` nullable | append-only, `ip_address`, `details JSON` |
| User → LoginHistory | 1 : N | `login_history.user_id` | no `updated_at`, stores `ip` + `userAgent` |
| Bug → AssignmentHistory | 1 : N | `assignment_history.bug_id` | `action` + `old/new_value`, append-only |

Defined in `server/src/models/index.js`.

---

## 3. Entity Details

### users `paranoid`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK AUTO_INCREMENT |
| name | VARCHAR(120) | NOT NULL |
| email | VARCHAR(160) | UNIQUE, validated |
| password_hash | VARCHAR(255) | BCrypt, hidden from JSON |
| role | ENUM | `admin, manager, developer, tester` NOT NULL |
| status | ENUM | `pending, approved, rejected, suspended` DEFAULT pending |
| profile_picture | VARCHAR(255) | `/uploads/...` nullable |
| last_login | DATETIME | nullable, stamped on login |
| approved_by | INT FK | → users.id nullable |
| rejected_reason | VARCHAR(255) | nullable |
| deleted_at | DATETIME | paranoid soft-delete |

### projects `paranoid`

| Column | Type | Notes |
|---|---|---|
| name | VARCHAR(160) | NOT NULL |
| description | TEXT | nullable |
| category | VARCHAR(80) | nullable |
| status | ENUM | `active, archived` DEFAULT active |
| start_date, deadline | DATE | deadline scanned by cron |
| progress | INT | 0-100 cached from bug states |
| manager_id, created_by | INT FK | → users.id |
| deleted_at | DATETIME | paranoid |

### project_members

Unique `(project_id, user_id)`. `role_in_project` ENUM `manager, developer, tester`.

### bugs `paranoid`

| Column | Type | Notes |
|---|---|---|
| project_id | INT FK | NOT NULL → projects.id |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL |
| steps_to_reproduce, expected_result, actual_result | TEXT | nullable (tester template) |
| environment | VARCHAR(255) | nullable |
| severity | ENUM | `low, medium, high, critical` DEFAULT medium |
| status | ENUM | `new, assigned, in_progress, resolved, verified, reopened, closed` DEFAULT new |
| reporter_id | INT FK | NOT NULL → users.id |
| due_date | DATE | scanned by cron |

**State machine** (`modules/bugs/bugLifecycle.js`):

```
new → assigned → in_progress → resolved → verified → closed
                  │               │           │
                  └── reopened ◀─┴───────────┘  reopened → assigned|in_progress
```

### bug_assignments — Unique `bug_id`

| Column | FK | Notes |
|---|---|---|
| tester_id | → users.id | nullable |
| assigned_by | → users.id | NOT NULL |

### bug_developers — Unique `(bug_id, developer_id)`

M:N join enabling multiple developers per bug.

### resolutions

Mandatory when `status → resolved`: `description, root_cause, code_change_summary` TEXT NOT NULL + `bug_id, developer_id` FK.

### comments

`bug_id FK, user_id FK (author), content TEXT NOT NULL`

### notifications

`user_id FK (recipient), type ENUM assignment|status|comment|deadline|approval|system, message VARCHAR(255), link VARCHAR(255) nullable, is_read BOOLEAN DEFAULT false`

Persist-then-emit: INSERT then `io.to(user:ID).emit(notification:new)`.

### audit_logs `append-only`

`user_id FK nullable (actor), action VARCHAR(120), entity_type VARCHAR(60), entity_id INT, details JSON, ip_address VARCHAR(60), created_at` (no updated_at).

### login_history

`user_id FK, login_at DATETIME DEFAULT NOW, ip_address VARCHAR(60), user_agent VARCHAR(255)` (no timestamps).

### assignment_history `append-only`

Trace per bug: `bug_id FK, action VARCHAR(120) reported|assigned|status_change, changed_by FK nullable, old_value VARCHAR(255), new_value VARCHAR(255), created_at`.

---

## 4. Keys & Constraints Summary

- **PKs**: `id` auto-increment on all tables; `created_at/updated_at` on most (except `audit_logs` creation-only, `login_history`/`assignment_history` custom).
- **Unique**: `users.email`, `bug_assignments.bug_id`, `(project_members.project_id,user_id)`, `(bug_developers.bug_id,developer_id)`.
- **Paranoid**: `users, projects, bugs` retain rows with `deleted_at` for audit/history.
- **FKs**: All `*_id` indexed via Sequelize; `underscored:true` maps `managerId→manager_id`.

---

## 5. Physical Notes

- `sequelize.sync({ alter:true })` on boot; `npm run seed` does `sync({ force:true })` + demo data (admin/manager/dev/tester + pending user + sample projects/bugs).
- For production replace sync with migrations (`sequelize-cli`).
- Avatar files stored in `server/uploads/` (Multer local), path saved in `users.profile_picture`.

---

*Generated for BugShield Pro · MySQL 8 + Sequelize · Render Mermaid in GitHub / VS Code.*

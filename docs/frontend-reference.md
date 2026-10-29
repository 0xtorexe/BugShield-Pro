# Frontend Reference

React 18 SPA under `client/src/`. Routing via `react-router-dom`, styling via Tailwind, charts
via Recharts, real-time via `socket.io-client`, toasts via `react-toastify`. State is kept
deliberately light: two React Contexts plus local component state and axios.

---

## Entry & Composition

### `main.jsx`
Mounts the provider tree:

```
BrowserRouter → AuthProvider → SocketProvider → <App/> + <ToastContainer/>
```

### `App.jsx`
Declares all routes. Public: `/login`, `/register`. Everything else is wrapped in
`ProtectedRoute → Layout`, with admin-only pages (`/users`, `/audit`) further guarded by a nested
`ProtectedRoute roles={['admin']}`.

| Path | Component | Access |
|---|---|---|
| `/login`, `/register` | `pages/auth/*` | Public |
| `/` | `Dashboard` | Any (role-branched) |
| `/users` | `admin/Users` | admin |
| `/audit` | `admin/Audit` | admin |
| `/projects`, `/projects/:id` | `projects/*` | Any |
| `/bugs`, `/bugs/:id` | `bugs/*` | Any |
| `/profile` | `Profile` | Any |

---

## Contexts

### `context/AuthContext.jsx` → `useAuth()`
Loads `/auth/me` on mount when a token exists. Exposes:

| Value | Type | Description |
|---|---|---|
| `user` | object \| null | Current user (null when logged out) |
| `loading` | boolean | True during the initial `/me` fetch |
| `login(email, password)` | `→ Promise<user>` | Stores token, sets user |
| `logout()` | `→ void` | Clears token + user |
| `updateUser(patch)` | `→ void` | Merge patch into `user` (e.g. after profile edit) |

### `context/SocketContext.jsx` → `useSocket()`
Opens an authenticated socket when a user is present; tears it down on logout. Fetches existing
notifications on connect and listens for `notification:new` (prepend + toast + unread bump).

| Value | Type | Description |
|---|---|---|
| `notifications` | array | Latest notifications |
| `unread` | number | Unread count (drives the badge) |
| `markRead(id)` | `→ Promise` | Mark one read |
| `markAllRead()` | `→ Promise` | Mark all read |
| `refresh()` | `→ Promise` | Re-fetch from the API |

---

## API client

### `api/client.js`
A single axios instance (`baseURL: '/api'`):

- **Request interceptor** — attaches `Authorization: Bearer <token>` from `localStorage`.
- **Response interceptor** — flattens the server's error message onto `error.message`; on `401`
  (except the login call) clears the stored token.

Import it as `api` and call `api.get/post/patch/put/delete`.

---

## Routing guard

### `routes/ProtectedRoute.jsx`
```
<ProtectedRoute roles={['admin']}> … </ProtectedRoute>
```
Shows a spinner while auth loads, redirects to `/login` when unauthenticated, and to `/` when the
user's role isn't in `roles` (omit `roles` to allow any authenticated user).

---

## Shared components — `components/`

| Component | Props | Purpose |
|---|---|---|
| `Layout` | — | Authenticated shell: role-filtered sidebar, header with user chip + logout, mobile nav, `<Outlet/>` |
| `NotificationBell` | — | Bell with unread badge and dropdown; marks read + navigates on click |
| `ui.jsx` → `Badge` | `className, children` | Pill label |
| `ui.jsx` → `Spinner` | `label?` | Centered loading spinner |
| `ui.jsx` → `EmptyState` | `title, subtitle?` | Empty-list placeholder |
| `ui.jsx` → `Modal` | `open, onClose, title, children, width?` | Overlay dialog |
| `ui.jsx` → `StatCard` | `label, value, accent?` | KPI tile |
| `ui.jsx` → `ProgressBar` | `value` (0–100) | Progress bar |

---

## Display helpers — `lib/ui.js`

Style maps and formatters shared across pages:

- `severityStyle`, `statusStyle`, `userStatusStyle`, `roleStyle` — Tailwind class maps per enum
  value (badge colors).
- `titleCase(s)` — `in_progress` → `In Progress`.
- `formatDate(d)`, `formatDateTime(d)` — locale strings with `—` fallback.
- `nextStatuses` — client mirror of the server transition table, used to render only the valid
  next-status buttons on the bug detail page. (The server remains the source of truth.)

---

## Pages — `pages/`

| Page | Route | Key behavior |
|---|---|---|
| `auth/Login` | `/login` | Credentials form; redirects if already authed; shows demo accounts |
| `auth/Register` | `/register` | Developer/tester registration; success shows the "awaiting approval" panel |
| `Dashboard` | `/` | **Role-branched:** admin/manager see analytics (KPIs + Recharts bar/pie, project progress, team velocity); developer/tester see their task/bug list |
| `admin/Users` | `/users` | Approval queue, status filters, approve/reject/suspend/reactivate, create-user modal |
| `admin/Audit` | `/audit` | Tabbed activity log + login history tables |
| `projects/Projects` | `/projects` | Project cards with progress; admin create-project modal |
| `projects/ProjectDetail` | `/projects/:id` | Team allocation (add/remove members), bug list, archive/restore, progress |
| `bugs/Bugs` | `/bugs` | Filterable bug table; tester "Report Bug" modal with the structured template |
| `bugs/BugDetail` | `/bugs/:id` | Full workflow UI: assign devs+tester modal, valid-transition buttons, mandatory resolution modal, comments, assignment + history sidebar |
| `Profile` | `/profile` | Update name + avatar (multipart), change password |

---

## Build & Dev

- `npm run dev` — Vite dev server on `:5173`, proxying `/api` and `/uploads` to `:5000`
  (`vite.config.js`).
- `npm run build` — production bundle to `client/dist/`.
- `npm run preview` — serve the built bundle locally.

Tailwind is configured in `tailwind.config.js` (custom `brand` palette) with component classes
(`.btn`, `.card`, `.input`, `.badge`, …) defined in `src/index.css`.

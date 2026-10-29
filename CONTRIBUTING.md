# Contributing to BugShield Pro

Thanks for your interest in contributing! This guide covers the conventions and workflow for the
project. It's a full-stack app — Express/Sequelize API in `server/`, React/Vite SPA in `client/`.

---

## Getting Started

1. Follow the [setup instructions](./README.md#getting-started) to run MySQL, seed the DB, and
   start both servers.
2. Read the [Architecture Overview](./docs/architecture.md) to understand the layering before
   making changes.
3. Pick up an issue or open one describing the change you intend to make.

---

## Development Workflow

```bash
# from a feature branch
git checkout -b feat/<short-description>

# backend
cd server && npm run dev        # nodemon reloads on change

# frontend (separate terminal)
cd client && npm run dev
```

- Branch off `main`. Use short, descriptive branch names: `feat/…`, `fix/…`, `docs/…`,
  `refactor/…`, `chore/…`.
- Keep PRs focused — one logical change per PR.
- Re-seed with `cd server && npm run seed` whenever you need a clean database. **This drops all
  tables**, so don't run it against data you want to keep.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>

feat(bugs): add reopen reason to status change
fix(auth): block suspended accounts at login
docs(api): document the assign endpoint
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`.

---

## Coding Conventions

### General
- **Match the surrounding style.** The codebase favors small, single-purpose functions and clear
  names over cleverness. Keep comment density similar to nearby code.
- Use the existing patterns rather than introducing new libraries or paradigms.

### Backend (`server/`)
- **Respect the layering:** `routes → controller → service → model`. HTTP concerns
  (`req`/`res`, status codes) stay in controllers; business logic and all DB access stay in
  services; SQL lives only in models.
- Throw `AppError(message, statusCode, details?)` for expected failures — never `res.status()`
  inside a service. The central `errorHandler` shapes the response.
- Wrap every controller handler in `catchAsync`.
- Validate input with `express-validator` chains + the `validate` middleware; don't hand-roll
  validation in controllers.
- Guard routes with `authenticate` and `authorize(...roles)` — never re-implement auth checks.
- Emit user-facing events through `services/notification.service` (`notify` / `notifyMany`) so
  they are both persisted and pushed.
- Record meaningful state changes with `utils/audit.logAudit(...)`.
- **Never change bug status outside `bugs.service.changeStatus`** — the state machine and its
  side effects (history, progress, notifications) must stay in one place.

### Frontend (`client/`)
- Call the API through the shared `api` axios instance (`api/client.js`) so auth headers and
  error normalization apply.
- Read auth/socket state via `useAuth()` / `useSocket()`; don't touch `localStorage` tokens
  directly.
- Reuse the shared components (`components/ui.jsx`) and style maps (`lib/ui.js`) instead of
  duplicating badges, spinners, modals, or color logic.
- Use Tailwind utility classes and the component classes defined in `src/index.css`
  (`.btn-primary`, `.card`, `.input`, …).
- Gate pages/actions with `ProtectedRoute` and `user.role` — the client mirror of the transition
  table in `lib/ui.js` is for UX only; the **server is the source of truth**.

---

## Adding a New Backend Module

Create `server/src/modules/<name>/` with:

```
<name>.routes.js       # paths + middleware chains
<name>.controller.js   # thin handlers (catchAsync + audit)
<name>.service.js      # business logic + Sequelize
<name>.validators.js   # express-validator rules (if the module takes input)
```

Then register it in `server/src/routes/index.js`:

```js
router.use('/<name>', require('../modules/<name>/<name>.routes'));
```

If it introduces a new entity, add the model under `models/`, wire associations in
`models/index.js`, and document the table in [`docs/database-schema.md`](./docs/database-schema.md).

---

## Testing & Verification

There is no automated test suite yet (a good first contribution!). Until then, verify changes
end-to-end:

1. `cd server && npm run seed && npm run dev`, then `cd client && npm run dev`.
2. Exercise the affected flow through the UI **and** with `curl` against the API.
3. For lifecycle/permission changes, confirm both the happy path and the rejected cases (illegal
   transitions → `400`, wrong role → `403`).

If you add tests, prefer testing services directly (they're pure of HTTP) and colocate them near
the module.

---

## Documentation

Update docs alongside code:

- New/changed endpoints → [`docs/api-reference.md`](./docs/api-reference.md)
- New/changed service or util functions → [`docs/backend-reference.md`](./docs/backend-reference.md)
- New components/pages → [`docs/frontend-reference.md`](./docs/frontend-reference.md)
- Schema changes → [`docs/database-schema.md`](./docs/database-schema.md)
- Structural changes → [`docs/architecture.md`](./docs/architecture.md)

---

## Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] Change is focused and follows the layering/conventions above
- [ ] Verified end-to-end (UI + API), including failure cases
- [ ] Relevant docs updated
- [ ] No secrets committed; `.env` stays local (only `.env.example` is tracked)
- [ ] Conventional commit messages

---

## Security

Do not open a public issue for security vulnerabilities. Instead, contact the maintainers
privately so a fix can be prepared before disclosure.

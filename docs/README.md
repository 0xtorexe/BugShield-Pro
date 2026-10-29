# BugShield Pro — Documentation

Complete documentation for the BugShield Pro enterprise bug tracking & project management system.

## Contents

| Document | What's inside |
|---|---|
| [Architecture Overview](./architecture.md) | How the major components fit together — topology, backend layering, auth flow, the bug lifecycle state machine, real-time notifications, cron, and the frontend structure |
| [API Reference](./api-reference.md) | Every REST endpoint: method, path, required role, request body, and response shape; plus the Socket.io contract |
| [Backend Reference](./backend-reference.md) | Public functions, classes, and middleware in `server/src/` — services, controllers, utils, models, jobs |
| [Frontend Reference](./frontend-reference.md) | React contexts, components, pages, routing, and the API client in `client/src/` |
| [Database Schema](./database-schema.md) | All tables, columns, enums, and Sequelize associations |

## Also see

- [Project README](../README.md) — setup, installation, usage, and demo walkthrough
- [CONTRIBUTING](../CONTRIBUTING.md) — conventions, workflow, and how to add a module

## Quick orientation

- **New to the codebase?** Read the [Architecture Overview](./architecture.md) first, then skim
  the [Database Schema](./database-schema.md).
- **Integrating with the API?** Go straight to the [API Reference](./api-reference.md).
- **Changing backend logic?** The [Backend Reference](./backend-reference.md) maps every service
  function.
- **Working on the UI?** The [Frontend Reference](./frontend-reference.md) lists every page and
  shared component.

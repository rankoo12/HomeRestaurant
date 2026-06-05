# Backend — Home Restaurant API

Fastify + Node.js + TypeScript. The single source of truth for data, auth, and money.
Never imports from `frontend/`. See the root [`CLAUDE.md`](../CLAUDE.md) for the rules.

## Folder map

| Path | Purpose |
|---|---|
| `src/api/routes/` | Fastify route handlers (thin — delegate to modules). |
| `src/api/middleware/` | Auth, RBAC guards, error handling, request validation hooks. |
| `src/api/plugins/` | Fastify plugins (jwt, cors, db decorators). |
| `src/modules/` | **Domain modules.** Each is interface-first (`interfaces.ts` + impl + `__tests__/`). One bounded context per folder. |
| `src/workers/` | BullMQ background workers (payouts, notifications). |
| `src/db/` | PostgreSQL pool, transaction helpers, and `migrations/`. |
| `src/types/` | Shared TS types + zod schemas. |
| `src/config/` | Typed env loading and config. |
| `src/utils/` | Small pure helpers. |
| `scripts/` | Migration runner, seeds. |

## Module convention

```
modules/<domain>/
  interfaces.ts          # the contract (depend on this, not the impl)
  <domain>.service.ts    # implementation
  __tests__/             # unit tests — a task isn't done without them
```

> Routes stay thin. Business logic lives in modules. Modules depend on abstractions, not each other's internals.

# Phase 1 — Foundation & Tooling

**Branch:** `phase-1-foundation` · **Depends on:** Phase 0 (skeleton) · **Status:** ✅ Complete

## Objective
Make both workspaces real and bootable. By the end, `main` has running shells for backend and frontend,
local infra in Docker, green CI, and an empty placeholder page for every route in the page spec.

## In scope
- `backend/`: `package.json`, `tsconfig.json`, Fastify entrypoint, health-check route, ESLint/Jest config, env loader.
- `frontend/`: Next.js app, `tsconfig.json`, Tailwind setup, root layout, `(public)` + `(app)` shells, placeholder pages for all routes.
- `docker-compose.yml`: Postgres + Redis only.
- `.env.example` for both apps.
- Root scripts / CI workflow for `typecheck` + `lint`.

## Out of scope
- Any business logic, real components, DB schema, or auth. Pages are placeholders.

## Requires specs
- `docs/specs/tooling-and-conventions.md` *(to author this phase)* — tsconfig strictness, ESLint ruleset, npm scripts, branch/commit conventions, CI steps.

## Acceptance checklist
- [x] `cd backend && npm run dev` boots Fastify; health-check returns 200. *(verified: `GET /health` → 200 ok)*
- [x] `cd frontend && npm run dev` serves the app; every spec route renders a placeholder under the right shell. *(22 routes build clean)*
- [x] `docker compose up -d` starts Postgres + Redis. *(both reached `healthy`)*
- [x] `npm run typecheck` and `npm run lint` pass in both workspaces.
- [x] `.env.example` present and documented; real `.env` git-ignored.

## Known issues
- 2 moderate `npm audit` advisories in the frontend trace to a transitive `postcss` pinned inside Next.js's own dep tree. `audit fix --force` would downgrade Next.js to v9 (unacceptable). Build-time only, not exploitable in our usage; resolves when Next.js bumps the pin. Tracked in `docs/known-issues/`.

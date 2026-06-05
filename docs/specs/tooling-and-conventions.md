# Spec — Tooling & Conventions

> **Status:** ✅ Authored (Phase 1). The foundation contract: language settings, lint rules, scripts,
> branch/commit conventions, and CI. Everything built afterward conforms to this.

## 1. Runtime & package manager
- **Node.js ≥ 20** (developed on 24.x). Pinned in each `package.json` `engines`.
- **npm** as the package manager (lockfile committed). No yarn/pnpm.
- **Two independent workspaces**, not an npm monorepo: `backend/` and `frontend/` each have their own
  `package.json`, `node_modules`, and lockfile. They are deployed separately and never import each other.

## 2. TypeScript
- **TypeScript 5.x**, `strict: true` everywhere. No `.js` in source.
- Shared baseline both apps adopt:

| Option | Value | Why |
|---|---|---|
| `strict` | `true` | Full strict family on. |
| `noUncheckedIndexedAccess` | `true` | `arr[i]` is `T \| undefined` — forces bounds awareness (matters for seat/capacity logic). |
| `noImplicitOverride` | `true` | Explicit `override`. |
| `noFallthroughCasesInSwitch` | `true` | Catch switch bugs. |
| `forceConsistentCasingInFileNames` | `true` | Cross-OS safety (Windows dev). |
| `verbatimModuleSyntax` | `true` | Explicit `import type`. |

- Backend: `module`/`moduleResolution` = `NodeNext`, `target` `ES2022`, compiles to `dist/`.
- Frontend: Next.js-managed tsconfig (`module: esnext`, `jsx: preserve`, `noEmit`, bundler resolution).
- **`any` is forbidden** without an inline `// eslint-disable-next-line` **plus** a comment justifying it.

## 3. Linting & formatting
- **ESLint** (flat config, `eslint.config.mjs`) with `@typescript-eslint`. Frontend also uses `eslint-config-next`.
- Key rules (error level): no-unused-vars (allow `_`-prefixed), no-explicit-any, consistent-type-imports,
  no-floating-promises (backend), require-await off.
- **Prettier** for formatting (default + `printWidth: 100`, `singleQuote: true`, `semi: true`). ESLint and
  Prettier don't fight: formatting is Prettier's job, correctness is ESLint's.
- **EditorConfig** at repo root: LF line endings, UTF-8, 2-space indent, final newline. (Resolves the
  Windows CRLF noise — git is configured to keep LF in the repo.)

## 4. NPM scripts (both workspaces expose these names)

| Script | Backend | Frontend |
|---|---|---|
| `dev` | `tsx watch src/api/server.ts` | `next dev` |
| `build` | `tsc -p tsconfig.json` | `next build` |
| `start` | `node dist/api/server.js` | `next start` |
| `typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `lint` | `eslint .` | `next lint` |
| `test` | `jest` | `jest` |
| `format` | `prettier --write .` | `prettier --write .` |

Backend also: `dev:worker`, `db:migrate`, `db:seed`, `test:integration` (added in their phases).

## 5. Directory & naming conventions
- Files: kebab-case (`auth.service.ts`, `event-card.tsx`). React components: PascalCase export, kebab-case file.
- Backend modules: `modules/<domain>/interfaces.ts` + `<domain>.service.ts` + `__tests__/`.
- Tests live in `__tests__/` next to the unit, named `<unit>.test.ts`.
- Types/DTOs shared within a workspace go in its `src/types/`. Frontend DTOs mirror backend response shapes.

## 6. Git conventions
- **One branch per phase:** `phase-<n>-<slug>` off `main` (e.g. `phase-1-foundation`).
- Feature work inside a phase may use `phase-<n>/<topic>` sub-branches merged into the phase branch.
- **Conventional Commits:** `type(scope): subject` — types `feat|fix|chore|docs|refactor|test|ci|build`.
  Scope is the module/area (`feat(booking): ...`, `chore(frontend): ...`).
- A phase merges to `main` via PR once its acceptance checklist passes.
- Never commit `.env` or secrets. `.env.example` is the documented template.

## 7. Environment config
- Backend loads env through a **typed config module** (`src/config/`) validated with **zod** at boot —
  the app refuses to start on missing/invalid env, rather than failing deep in a request.
- Frontend: only `NEXT_PUBLIC_*` vars reach the browser; the API base URL for the proxy is server-side.
- Each app ships an `.env.example` enumerating every var with a comment.

## 8. Testing
- **Jest** + **ts-jest** for unit tests, per workspace. A task isn't done until its tests are written/updated.
- Coverage is informational in Phase 1; thresholds are introduced alongside the domain modules (Phase 2+).
- Integration/DB tests (`test:integration`) and any browser tests arrive in the phases that need them.

## 9. CI
- A GitHub Actions workflow runs on push/PR: install, `typecheck`, and `lint` for **both** workspaces
  (matrix). Tests join the matrix from Phase 2 onward. CI must be green before a phase PR merges.

## 10. Definition of Done (every task)
1. Matches its spec. 2. `typecheck` clean. 3. `lint` clean. 4. Tests written/updated and passing.
5. No `.env`/secrets committed. 6. Conventional-commit message.

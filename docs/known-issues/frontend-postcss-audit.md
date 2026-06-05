# Known issue — frontend postcss audit advisory

**Status:** Accepted (Phase 1) · **Severity:** Moderate (build-time only)

## What
`npm audit` in `frontend/` reports 2 moderate advisories for `postcss <8.5.10`
(GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` in CSS stringify output).
The vulnerable copy is a **transitive dependency pinned inside Next.js's own
dependency tree** (`node_modules/next/node_modules/postcss`), not a direct dep.

## Why we're not "fixing" it
`npm audit fix --force` resolves it by installing `next@9.x` — a multi-major
downgrade that would break the entire App Router setup. That trade is
unacceptable. The advisory concerns CSS stringify output and is not reachable in
our build-time usage.

## Resolution path
Clears automatically when Next.js bumps its internal `postcss` pin. Re-check on
each `next` upgrade; remove this note once `npm audit` is clean.

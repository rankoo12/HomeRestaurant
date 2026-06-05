# Home Restaurant

A web-based peer-to-peer **home-dining platform** — guests discover and book dining events hosted by
verified home chefs; chefs manage events and earnings; admins handle verification and moderation.

University final project by **Ran Eckstein** and **Inbar Halutzy**.

## Stack
Next.js (App Router) + Tailwind · Fastify (Node.js + TypeScript) · PostgreSQL · Redis · BullMQ · Stripe.

## Repository layout
```
backend/    Fastify API — domain modules, workers, DB.   (see backend/README.md)
frontend/   Next.js app — Atomic Design components.       (see frontend/README.md)
docs/
  specs/    Spec-driven design (SDD). Start at specs/00-index.md.
    phases/ The 8-phase build plan (00-master-plan.md).
  design/   Visual reference prototype + screenshots (read-only).
```

## Working agreement
Read [`CLAUDE.md`](./CLAUDE.md) first — it defines how we build (SDD, SOLID, strict TS, Atomic Design,
front/back separation, no overbooking). Work proceeds **one phase per branch**; see
[`docs/specs/phases/00-master-plan.md`](./docs/specs/phases/00-master-plan.md).

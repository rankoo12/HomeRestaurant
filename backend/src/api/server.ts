import { buildApp } from './app.js';
import { loadEnv } from '../config/env.js';
import { PostgresSeatHoldRepository } from '../modules/booking/postgres.seat-hold-repository.js';
import { PostgresEventRepository } from '../modules/events/postgres.event-repository.js';

/** How often the maintenance sweep runs. Hygiene only — see the note below. */
const SWEEP_INTERVAL_MS = 5 * 60_000;

/**
 * Server entrypoint. Loads + validates env, builds the app, and listens.
 */
async function start(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp(env);

  // Maintenance sweep, in-process (BullMQ deferred until real worker infra —
  // docs/known-issues/phase-6-deferrals.md):
  // 1. Seat holds (Phase 6, HYGIENE ONLY): flips past-due active holds to
  //    `expired`; availability queries already discount them, so correctness
  //    never depends on this running.
  // 2. Event completion (Phase 7): `published` whose end time passed →
  //    `completed` — feeds chef_stats.dinners_hosted and review eligibility
  //    (docs/specs/events.md §3).
  const holds = new PostgresSeatHoldRepository();
  const events = new PostgresEventRepository();
  const sweep = async (): Promise<void> => {
    const swept = await holds.sweepExpired();
    if (swept > 0) app.log.info({ swept }, 'seat-hold sweeper: expired stale holds');
    const completed = await events.completePastEvents();
    if (completed > 0) app.log.info({ completed }, 'event sweeper: completed past events');
  };
  const sweeper = setInterval(() => {
    sweep().catch((err) => app.log.warn(err, 'maintenance sweep failed (will retry next tick)'));
  }, SWEEP_INTERVAL_MS);
  app.addHook('onClose', async () => clearInterval(sweeper));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();

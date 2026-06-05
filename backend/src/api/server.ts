import { buildApp } from './app.js';
import { loadEnv } from '../config/env.js';

/**
 * Server entrypoint. Loads + validates env, builds the app, and listens.
 */
async function start(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp(env);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();

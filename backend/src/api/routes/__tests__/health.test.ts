import { buildApp } from '../../app.js';
import { loadEnv } from '../../../config/env.js';
import type { FastifyInstance } from 'fastify';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: 'test' });
    app = await buildApp(env);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with an ok status payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('home-restaurant-backend');
    expect(typeof body.timestamp).toBe('string');
  });
});

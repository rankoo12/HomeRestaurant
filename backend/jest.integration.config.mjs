/**
 * Integration tests — hit a real Postgres (TEST_DATABASE_URL). Run serially
 * (--runInBand from the npm script) so tests don't contend on the same tables.
 * Kept separate from the default jest config (unit tests) so `npm test` stays
 * fast and DB-free in CI until the DB is provisioned.
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { verbatimModuleSyntax: false } }],
  },
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  setupFiles: ['<rootDir>/jest.integration.setup.mjs'],
  clearMocks: true,
  // Real DB round-trips + serial argon2 hashing; the 5s default is too tight for
  // the multi-host booking/refund flows. Give each test room without masking hangs.
  testTimeout: 30_000,
};

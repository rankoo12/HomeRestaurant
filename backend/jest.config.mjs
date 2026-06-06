/** @type {import('ts-jest').JestConfigWithTsJest} */
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
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Integration tests (real DB) run via the separate integration config.
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  clearMocks: true,
};

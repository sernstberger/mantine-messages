module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  // esbuild-jest hands any file containing the text "ock(" (meant to catch jest.mock) to Babel,
  // which is not set up here. Avoid that text in names, and mock modules through
  // moduleNameMapper instead of jest.mock().
  transform: {
    // es2022 keeps object spread as it is (no injected helpers that count as uncovered branches),
    // and source maps make coverage point at the source lines
    '^.+\\.tsx?$': ['esbuild-jest', { target: 'es2022', sourcemap: true }],
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // Agent worktrees under .claude/ hold whole copies of the repo; their tests are not ours.
  // e2e/ (and the kit in harness/) are Playwright specs, run by `npm run e2e`
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/', '<rootDir>/e2e/', '<rootDir>/harness/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  // Every source file is fully covered; keep it that way
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  collectCoverageFrom: [
    'package/src/**/*.{ts,tsx}',
    '!package/src/**/*.story.tsx',
    '!package/src/**/*.d.ts',
    '!package/src/sample-data.ts',
    // Types only, no code runs
    '!package/src/types.ts',
    // The work-queue example is tested like the package
    'docs/demos/WorkQueue/**/*.{ts,tsx}',
    '!docs/demos/WorkQueue/types.ts',
  ],
  setupFilesAfterEnv: ['./jsdom.mocks.cjs'],
  moduleNameMapper: {
    // react-markdown and remark-gfm are ESM only and Jest runs CommonJS: tests get stand-ins
    '^react-markdown$': '<rootDir>/test-utils/react-markdown.mock.tsx',
    '^remark-gfm$': '<rootDir>/test-utils/remark-gfm.mock.ts',
    // The example imports the package by name, as an app does; tests run it against the source
    '^mantine-messages$': '<rootDir>/package/src/index.ts',
    '\\.(css)$': 'identity-obj-proxy',
  },
};

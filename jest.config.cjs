module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  // esbuild-jest sends files that call jest's module mocker to Babel: use moduleNameMapper instead
  transform: {
    // es2022 keeps object spread as is: no injected helpers that count as uncovered branches
    '^.+\\.tsx?$': ['esbuild-jest', { target: 'es2022', sourcemap: true }],
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // .claude/ worktrees hold copies of the repo; e2e/ and harness/ are Playwright, not Jest
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.claude/',
    '<rootDir>/e2e/',
    '<rootDir>/harness/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  collectCoverageFrom: [
    'package/src/**/*.{ts,tsx}',
    '!package/src/**/*.story.tsx',
    '!package/src/**/*.d.ts',
    '!package/src/sample-data.ts',
    '!package/src/types.ts',
    'docs/demos/WorkQueue/**/*.{ts,tsx}',
    '!docs/demos/WorkQueue/types.ts',
  ],
  setupFilesAfterEnv: ['./jsdom.mocks.cjs', './jest-console.cjs'],
  moduleNameMapper: {
    // ESM-only packages that Jest's CommonJS cannot load
    '^react-markdown$': '<rootDir>/test-utils/react-markdown.mock.tsx',
    '^remark-gfm$': '<rootDir>/test-utils/remark-gfm.mock.ts',
    '^mantine-messages$': '<rootDir>/package/src/index.ts',
    '\\.(css)$': 'identity-obj-proxy',
  },
};

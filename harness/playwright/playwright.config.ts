// Shared by every Mantine lib on the harness: only PORT differs between repos.
import { defineConfig, devices } from '@playwright/test';

// A port no other server of this repo uses (not Storybook's own dev port); E2E_PORT overrides it
const PORT = Number(process.env.E2E_PORT ?? 8283);
const CI = !!process.env.CI;

// E2E_DEV=1 tests against `storybook dev` (reused when it is already running on PORT). Otherwise
// the static build in storybook-static/ is served, as in CI: `npm run e2e` builds it first
const DEV = !!process.env.E2E_DEV;

const viewport = { width: 1280, height: 900 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport } },
  ],
  webServer: {
    command: DEV
      ? `npx storybook dev --port ${PORT} --ci --no-open`
      : `npx vite preview --outDir storybook-static --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});

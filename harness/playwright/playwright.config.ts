// Shared by every Mantine lib on the harness: only PORT differs between repos.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8283);
const CI = !!process.env.CI;

const DEV = !!process.env.E2E_DEV;
/** A cold Vite dev server re-optimises dependencies and reloads pages under many parallel workers */
const DEV_WORKERS = 2;
const DEV_TEST_TIMEOUT_MS = 180_000;

const viewport = { width: 1280, height: 900 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : DEV ? DEV_WORKERS : undefined,
  timeout: DEV ? DEV_TEST_TIMEOUT_MS : undefined,
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

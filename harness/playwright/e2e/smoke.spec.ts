// Shared by every Mantine lib on the harness: keep this file identical across repos.
// One test per story and color scheme: the story renders, with Mantine's styles, and logs no
// errors. A story tagged 'no-smoke' (`tags: ['no-smoke']`) is left out; one that shows an error on
// purpose lists the console messages to expect in `parameters: { e2e: { allowConsole: [/404/] } }`.
import type { Page, Request } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import {
  expect,
  expectMantineStyles,
  openStory,
  test,
  watchConsole,
  type ColorScheme,
} from './support/story';

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
  tags?: string[];
}

const SCHEMES: ColorScheme[] = ['light', 'dark'];
const INDEX = 'storybook-static/index.json';

const stories = (index: { entries: Record<string, IndexEntry> }) =>
  Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && !entry.tags?.includes('no-smoke')
  );

async function smoke(page: Parameters<typeof openStory>[0], id: string, theme: ColorScheme) {
  const root = await openStory(page, id, { theme });
  await expectMantineStyles(page);
  await expect(root).not.toBeEmpty();
}

// A 404 never fires `requestfinished` in Chromium, so `response` counts as done too
function countRequests(page: Page) {
  const pending = new Set<Request>();
  page.on('request', (request) => pending.add(request));
  page.on('response', (response) => pending.delete(response.request()));
  page.on('requestfinished', (request) => pending.delete(request));
  page.on('requestfailed', (request) => pending.delete(request));
  return () => pending.size;
}

if (!process.env.E2E_DEV && existsSync(INDEX)) {
  for (const entry of stories(JSON.parse(readFileSync(INDEX, 'utf8')))) {
    for (const theme of SCHEMES) {
      test(`${entry.title} / ${entry.name} renders in ${theme}`, async ({ page }) => {
        await smoke(page, entry.id, theme);
      });
    }
  }
} else {
  // A fresh page per story: pending module imports of the last one abort when a page navigates
  test('every story renders in light and dark', async ({ context, request }) => {
    test.setTimeout(0);
    const index = await (await request.get('/index.json')).json();

    for (const entry of stories(index)) {
      for (const theme of SCHEMES) {
        await test.step(`${entry.title} / ${entry.name} in ${theme}`, async () => {
          const page = await context.newPage();
          const unexpected = watchConsole(page);
          const inFlight = countRequests(page);

          try {
            await smoke(page, entry.id, theme);
            await expect.poll(inFlight, { message: 'requests still in flight' }).toBe(0);
            expect(unexpected(), 'console errors and page errors').toEqual([]);
          } finally {
            await page.close();
          }
        });
      }
    }
  });
}

// Shared by every Mantine lib on the harness: keep this file identical across repos.
// One test per story and color scheme: the story renders, with Mantine's styles, and logs no
// errors. A story tagged 'no-smoke' (`tags: ['no-smoke']`) is left out.
import { existsSync, readFileSync } from 'fs';
import { expect, expectMantineStyles, openStory, test, type ColorScheme } from './support/story';

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

if (!process.env.E2E_DEV && existsSync(INDEX)) {
  // The static build lists every story up front: one test each, so a report names the story
  for (const entry of stories(JSON.parse(readFileSync(INDEX, 'utf8')))) {
    for (const theme of SCHEMES) {
      test(`${entry.title} / ${entry.name} renders in ${theme}`, async ({ page }) => {
        await smoke(page, entry.id, theme);
      });
    }
  }
} else {
  // Against the dev server the list is only known at run time: one test, a step per story
  test('every story renders in light and dark', async ({ page, request }) => {
    test.setTimeout(0);
    const index = await (await request.get('/index.json')).json();

    for (const entry of stories(index)) {
      for (const theme of SCHEMES) {
        await test.step(`${entry.title} / ${entry.name} in ${theme}`, () =>
          smoke(page, entry.id, theme));
      }
    }
  });
}

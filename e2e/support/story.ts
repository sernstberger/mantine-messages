// Shared by every Mantine lib on the harness: keep this file identical across repos.
// Opens Storybook stories in a real browser and fails a test on any console error or page error.
import { test as base, expect, type Locator, type Page } from '@playwright/test';

export { expect };

export type ColorScheme = 'light' | 'dark';

export interface StoryOptions {
  /** Storybook global `theme`, which the preview decorator passes to MantineProvider; light by default */
  theme?: ColorScheme;

  /** Emulates `prefers-reduced-motion: reduce`, so smooth scrolls and transitions are instant */
  reducedMotion?: boolean;

  /** Story args, for example `{ size: 'lg' }` */
  args?: Record<string, string | number | boolean>;
}

interface Fixtures {
  /** Console messages that do not fail the test; `test.use({ allowConsole: [/ResizeObserver/] })` */
  allowConsole: RegExp[];

  /** Console errors and page errors seen so far; the test fails if any are left at the end */
  consoleErrors: string[];
}

export const test = base.extend<Fixtures>({
  allowConsole: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowConsole }, use) => {
      const errors: string[] = [];
      const allowed = (text: string) => allowConsole.some((pattern) => pattern.test(text));

      page.on('console', (message) => {
        if (message.type() === 'error' && !allowed(message.text())) {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => {
        if (!allowed(error.message)) {
          errors.push(`page error: ${error.message}`);
        }
      });

      await use(errors);
      expect(errors, 'console errors and page errors').toEqual([]);
    },
    { auto: true },
  ],
});

/** URL of a story in Storybook's preview iframe, without the manager UI around it */
export function storyUrl(id: string, { theme = 'light', args }: StoryOptions = {}) {
  const params = new URLSearchParams({ id, viewMode: 'story', globals: `theme:${theme}` });

  if (args) {
    params.set(
      'args',
      Object.entries(args)
        .map(([key, value]) => `${key}:${value}`)
        .join(';')
    );
  }

  return `/iframe.html?${params}`;
}

/**
 * Opens a story and waits until it has rendered, its fonts have loaded and Mantine has applied
 * the color scheme. Throws Storybook's own error when the story fails to render. Returns the
 * story's root element
 */
export async function openStory(page: Page, id: string, options: StoryOptions = {}) {
  const { theme = 'light', reducedMotion = false } = options;
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.goto(storyUrl(id, options));

  // Storybook marks <body> with the phase it is in; wait for a final one
  const phase = await page.waitForFunction(() => {
    const { classList } = document.body;
    return ['sb-show-main', 'sb-show-errordisplay', 'sb-show-nopreview'].find((name) =>
      classList.contains(name)
    );
  });

  const shown = await phase.jsonValue();

  if (shown === 'sb-show-nopreview') {
    throw new Error(`No story with id "${id}"`);
  }

  if (shown === 'sb-show-errordisplay') {
    throw new Error(`Story "${id}" threw: ${await page.locator('#error-message').innerText()}`);
  }

  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', theme);

  return page.locator('#storybook-root');
}

/**
 * Fails unless Mantine's global styles are on the page: catches a story or a build that loads
 * the components without their CSS
 */
export async function expectMantineStyles(page: Page) {
  const bodyColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--mantine-color-body').trim()
  );
  expect(
    bodyColor,
    '--mantine-color-body is not defined: @mantine/core styles are missing'
  ).not.toBe('');
}

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;

  /** Pixels between the bottom of the viewport and the end of the content */
  fromBottom: number;
}

/**
 * Finds the nearest scrolling ancestor of `locator` (or the element itself), such as a ScrollArea
 * viewport; scrolls it to `to` when given, as a user would; returns its scroll position
 */
function scroller(locator: Locator, to?: number | 'bottom'): Promise<ScrollMetrics> {
  return locator.evaluate((element, target) => {
    let node: Element = document.scrollingElement!;

    for (let current: Element | null = element; current; current = current.parentElement) {
      const { overflowY } = getComputedStyle(current);

      if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
        node = current;
        break;
      }
    }

    if (target !== null) {
      node.scrollTop = target === 'bottom' ? node.scrollHeight : target;
    }

    const { scrollTop, scrollHeight, clientHeight } = node;
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      fromBottom: scrollHeight - scrollTop - clientHeight,
    };
  }, to ?? null);
}

/** Scroll position of the nearest scrolling ancestor of `locator` */
export const scrollMetrics = (locator: Locator) => scroller(locator);

/** Scrolls the nearest scrolling ancestor of `locator` to `top` px, or to the bottom */
export const scrollTo = (locator: Locator, top: number | 'bottom') => scroller(locator, top);

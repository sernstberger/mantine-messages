// A 10,000-message ChatThread windowed with @tanstack/react-virtual through MessageList's
// rowsComponent: the chat behaviours of use-message-list with only the rows in view rendered
import { expect, openStory, scrollMetrics, scrollTo, test } from './support/story';

const STORY = 'messagelist--windowed';

test('opens at the newest message with only a window of rows rendered', async ({ page }) => {
  await openStory(page, STORY);
  const log = page.getByRole('log');
  const newest = log.locator('[data-item-id="m-10500"]');

  await expect(newest).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(1);
  expect(await log.locator('[data-item-id]').count()).toBeLessThan(60);
});

test('stays at the bottom when the user sends a message', async ({ page }) => {
  await openStory(page, STORY);
  const log = page.getByRole('log');
  await expect(log.locator('[data-item-id="m-10500"]')).toBeInViewport();

  const composer = page.getByRole('textbox', { name: 'Message' });
  await composer.fill('Sent at the end of a long thread');
  await composer.press('Enter');

  await expect(log.getByText('Sent at the end of a long thread')).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(1);
});

test('keeps the view steady when older messages load above', async ({ page }) => {
  await openStory(page, STORY);
  const log = page.getByRole('log');
  await expect(log.locator('[data-item-id="m-10500"]')).toBeInViewport();

  // For 600 ms after opening, use-message-list treats the list as at the bottom whatever the
  // scroll position, and pins it there as the virtualizer measures rows
  await page.waitForTimeout(700);
  await scrollTo(log, 0);
  const oldest = log.locator('[data-item-id="m-501"]');
  await expect(oldest).toBeInViewport();
  const top = (await oldest.boundingBox())!.y;

  // At the top the story loads 500 older messages after 500 ms
  await expect(page.getByText('10,500 messages')).toBeVisible();
  await expect(oldest).toBeInViewport();
  expect(Math.abs((await oldest.boundingBox())!.y - top)).toBeLessThanOrEqual(60);
  expect((await scrollMetrics(log)).scrollTop).toBeGreaterThan(10_000);
});

test('jumps to a message outside the window, then focuses and flashes it', async ({ page }) => {
  await openStory(page, STORY);
  const log = page.getByRole('log');
  await expect(log.locator('[data-item-id="m-10500"]')).toBeInViewport();
  await expect(log.locator('[data-item-id="m-1501"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Jump to message 1501' }).click();

  const target = log.locator('[data-item-id="m-1501"]');
  await expect(target).toBeInViewport({ ratio: 1 });
  await expect(target).toBeFocused();
  await expect(target.locator('[data-highlighted]')).toHaveCount(1);
});

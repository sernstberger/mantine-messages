// Scrolling of ChatThread in a real layout: jsdom has no scroll positions or heights
import { expect, openStory, scrollMetrics, scrollTo, test } from './support/story';

test('opens at the newest message', async ({ page }) => {
  await openStory(page, 'messages--long-thread');
  const log = page.getByRole('log');

  // Fully in view. It ends 4px short of the very bottom: the Composer settles its height after
  // the list has scrolled, the bug the "composer grows" test below shows in full
  await expect(log.getByText('Message 80 of 80')).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(8);
});

test('stays at the bottom when a reply arrives', async ({ page }) => {
  await openStory(page, 'messages--messenger');
  const log = page.getByRole('log');
  const items = log.locator('[data-item-id]');
  const before = await items.count();

  const composer = page.getByRole('textbox', { name: 'Message' });
  await composer.fill('Are we still on for Saturday?');
  await composer.press('Enter');
  await expect(log.getByText('Are we still on for Saturday?')).toBeInViewport();

  // The story answers 1.5 s later, as someone else: the list follows because it was at the bottom
  await expect(items).toHaveCount(before + 2, { timeout: 5_000 });
  await expect(items.last()).toBeInViewport();
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(1);
});

test('keeps the view steady when older messages load above', async ({ page }) => {
  await openStory(page, 'messages--long-thread');
  const log = page.getByRole('log');
  const oldest = log.getByText('Message 41 of 80', { exact: true });
  await expect(log.getByText('Message 80 of 80')).toBeInViewport();

  // Scrolling to the top asks for 20 older messages, which the story adds after 800 ms
  await scrollTo(log, 0);
  const top = (await oldest.boundingBox())!.y;
  await expect(log.getByText('Message 21 of 80', { exact: true })).toBeAttached();

  // Without the correction the 20 new messages (about 1000px) would push it down out of view.
  // It may move by the height of the loader that shows while loading, no more
  await expect(oldest).toBeInViewport();
  expect(Math.abs((await oldest.boundingBox())!.y - top)).toBeLessThanOrEqual(60);
  expect((await scrollMetrics(log)).scrollTop).toBeGreaterThan(500);
});

// KNOWN BUG, expected to fail until it is fixed (then this test fails as "expected to fail" and
// test.fail() comes off). MessageList re-pins to the bottom only when it re-renders; when its
// viewport shrinks without a render (the Composer below grows with each line) the newest message
// slides under the composer, 68px here. Fix: a ResizeObserver on the viewport in
// use-message-list.ts that scrolls to the bottom while the user is at the bottom
test('stays at the bottom while the composer grows', async ({ page }) => {
  test.fail();
  await openStory(page, 'messages--long-thread');
  const log = page.getByRole('log');
  await expect(log.getByText('Message 80 of 80')).toBeInViewport();

  const composer = page.getByRole('textbox', { name: 'Message' });
  await composer.fill('One\nTwo\nThree\nFour');

  await expect(log.getByText('Message 80 of 80')).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(1);
});

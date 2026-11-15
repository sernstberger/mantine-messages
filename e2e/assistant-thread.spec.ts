// AssistantThread while an answer streams in: the thread grows and keeps its newest text in view
import { expect, openStory, scrollMetrics, test } from './support/story';

test('a streaming answer grows the thread and stays at the bottom', async ({ page }) => {
  await openStory(page, 'assistantthread--assistant');
  const log = page.getByRole('log');
  const composer = page.getByRole('textbox', { name: 'Ask anything' });
  const start = await scrollMetrics(log);

  await composer.fill('How do I throttle a scroll handler?');
  await composer.press('Enter');
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await expect(stop).toBeVisible();

  // Sample while it streams (about 7 s at one step per 30 ms). Skip the first 700 ms: the
  // prompt's own smooth scroll is still on its way down
  await page.waitForTimeout(700);
  const samples: { fromBottom: number; scrollHeight: number }[] = [];

  while (await stop.isVisible()) {
    samples.push(await scrollMetrics(log));
    await page.waitForTimeout(150);
  }

  expect(samples.length).toBeGreaterThan(5);
  expect(samples[samples.length - 1].scrollHeight).toBeGreaterThan(start.scrollHeight + 300);
  // Pinned all the way: never more than a line's worth from the bottom
  expect(Math.max(...samples.map((sample) => sample.fromBottom))).toBeLessThanOrEqual(24);

  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
  await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(8);
});

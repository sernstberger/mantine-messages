// The work-queue example: layout, focus and scrolling that jsdom cannot see
import type { Page } from '@playwright/test';
import { expect, openStory, scrollMetrics, test } from './support/story';

const ticketOf = (label: string) => label.replace(/^Select /, '');

/** The table row of a ticket, found by its checkbox */
const rowOf = (page: Page, id: string) =>
  page.getByRole('row').filter({ has: page.getByRole('checkbox', { name: `Select ${id}` }) });

/** Ids of the first `count` tickets in the table, from their checkboxes */
async function firstTickets(page: Page, count: number) {
  const labels = await page
    .getByRole('checkbox', { name: /^Select T-/ })
    .evaluateAll((boxes) => boxes.map((box) => box.getAttribute('aria-label')!));
  return labels.slice(0, count).map(ticketOf);
}

test.describe('table view', () => {
  test('selecting a row does not move the rows below it', async ({ page }) => {
    await openStory(page, 'work-queue--queue');
    const [first, second] = await firstTickets(page, 2);
    const checkbox = page.getByRole('checkbox', { name: `Select ${first}` });
    const next = rowOf(page, second);
    const before = (await next.boundingBox())!;

    // The bulk bar replaces the filters: it must cover them, not push the table down
    await checkbox.check();
    await expect(page.getByText('1 selected')).toBeVisible();
    expect((await next.boundingBox())!.y).toBeCloseTo(before.y, 0);

    await checkbox.uncheck();
    await expect(page.getByText('1 selected')).toBeHidden();
    expect((await next.boundingBox())!.y).toBeCloseTo(before.y, 0);
  });

  test('assigns the selected tickets to an agent', async ({ page }) => {
    await openStory(page, 'work-queue--queue');
    const ids = await firstTickets(page, 2);
    // Columns: select, ticket, status, priority, assignee
    const assignee = (id: string) => rowOf(page, id).getByRole('cell').nth(4);

    for (const id of ids) {
      await page.getByRole('checkbox', { name: `Select ${id}` }).check();
    }

    await expect(page.getByText('2 selected')).toBeVisible();
    await page.getByRole('button', { name: 'Assign' }).click();
    // The second agent: the first is "You", whom some tickets may have already
    const agent = page.getByRole('menuitem').nth(1);
    const name = (await agent.innerText()).trim();
    await expect(assignee(ids[0])).not.toContainText(name);
    await agent.click();

    // The selection clears and both rows show the agent (after the avatar's initials)
    await expect(page.getByText('2 selected')).toBeHidden();

    for (const id of ids) {
      await expect(assignee(id)).toContainText(name);
    }
  });
});

test.describe('split view', () => {
  test('opens a ticket from the list and marks it read', async ({ page }) => {
    await openStory(page, 'work-queue--split-view');
    const list = page.getByRole('list', { name: 'Tickets' });
    const unread = list.getByRole('button', { name: /, unread$/ }).first();
    const label = (await unread.getAttribute('aria-label'))!;
    const read = list.getByRole('button', { name: label.replace(/, unread$/, ''), exact: true });
    const subject = label.split(', ')[0];

    await unread.click();

    await expect(read).toHaveAttribute('aria-current', 'true');
    await expect(
      page.getByRole('region', { name: 'Conversation' }).getByText(subject, { exact: true }).first()
    ).toBeVisible();
  });

  test('Activity scrolls the timeline to the event and flashes it', async ({ page }) => {
    await openStory(page, 'work-queue--split-view');
    const details = page.getByRole('complementary', { name: 'Ticket details' });
    const log = page.getByRole('region', { name: 'Conversation' }).getByRole('log');
    // The buttons under the Activity heading, one per event
    const activity = details
      .getByText('Activity', { exact: true })
      .locator('xpath=following-sibling::*[1]')
      .getByRole('button');
    const first = activity.first();
    await expect(first).toBeVisible();
    // A link reads "<event> <date>"; the timeline shows "<event> · <time>"
    const text = (await first.innerText()).split('\n')[0].trim();

    // The timeline opens at the bottom; move away from the event first
    await expect.poll(async () => (await scrollMetrics(log)).fromBottom).toBeLessThanOrEqual(8);
    await first.click();

    const item = log.locator('[data-item-id]').filter({ hasText: text });
    await expect(item).toBeInViewport();
    await expect(log.locator('[data-highlighted]')).toContainText(text);
    // The flash ends after 1.6 s
    await expect(log.locator('[data-highlighted]')).toHaveCount(0, { timeout: 4_000 });
  });

  test.describe('narrow', () => {
    test('Details opens the ticket details over the conversation; Escape and the backdrop close them', async ({
      page,
    }) => {
      await openStory(page, 'work-queue--split-view-narrow');
      const toggle = page.getByRole('button', { name: 'Details' });
      const details = page.getByRole('complementary', { name: 'Ticket details' });

      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(details).toBeHidden();

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(details).toBeVisible();

      // Escape closes it while the focus is inside the details
      await details.getByRole('button').last().focus();
      await page.keyboard.press('Escape');
      await expect(details).toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      // A click on the dimmed conversation beside it closes it too
      await toggle.click();
      await expect(details).toBeVisible();
      const main = (await page.getByRole('region', { name: 'Conversation' }).boundingBox())!;
      await page.mouse.click(main.x + 20, main.y + main.height / 2);
      await expect(details).toBeHidden();
    });
  });
});

test.describe('open ticket', () => {
  test('an email opens in a dialog; Escape closes it and the focus goes back', async ({ page }) => {
    await openStory(page, 'work-queue--open-ticket');
    const open = page.getByRole('button', { name: /^Open email: / }).first();
    const subject = (await open.getAttribute('aria-label'))!.replace(/^Open email: /, '');

    // From the keyboard: WebKit does not focus a button on click, so there would be nothing to
    // return to
    await open.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: subject });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('Enter sends a reply and keeps the focus in the composer', async ({ page }) => {
    await openStory(page, 'work-queue--open-ticket');
    const log = page.getByRole('log');
    const composer = page.getByRole('textbox', { name: 'Message' });

    await composer.fill('Refund is on its way, Nora.');
    await composer.press('Enter');

    await expect(log.getByText('Refund is on its way, Nora.')).toBeInViewport();
    await expect(composer).toHaveValue('');
    await expect(composer).toBeFocused();
  });
});

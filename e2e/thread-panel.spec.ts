// ThreadPanel focus in a real browser, by keyboard: WebKit does not focus a button on click, and
// the panel moves focus only from a focused control
import { expect, openStory, test } from './support/story';

for (const theme of ['light', 'dark'] as const) {
  test(`a thread takes focus on its title and gives it back to the opener on close (${theme})`, async ({
    page,
  }) => {
    await openStory(page, 'team--team', { theme });
    const opener = page.getByRole('button', { name: /\d+ repl(y|ies)/ }).first();
    await opener.focus();
    await page.keyboard.press('Enter');

    const title = page.getByRole('heading', { name: 'Thread' });
    await expect(title).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Message' }).last()).toBeVisible();

    // WebKit's Tab skips buttons unless Option is held: focus the close button directly
    await page.getByRole('button', { name: 'Close thread' }).focus();
    await page.keyboard.press('Enter');
    await expect(title).toBeHidden();
    await expect(opener).toBeFocused();
  });
}

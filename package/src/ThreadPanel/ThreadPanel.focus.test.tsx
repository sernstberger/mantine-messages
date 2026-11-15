import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { Composer } from '../Composer/Composer';
import type { ChatMessage, MessagesUser } from '../types';
import { ThreadPanel, ThreadPanelProps } from './ThreadPanel';

const users: MessagesUser[] = [{ id: 'me', name: 'You' }];

const message = (id: string, body: string): ChatMessage => ({
  id,
  authorId: 'me',
  body,
  createdAt: new Date(2026, 10, 15, 9),
});

const first = message('a', 'First thread');
const second = message('b', 'Second thread');

function Channel(props: Partial<ThreadPanelProps> & { removeOpeners?: boolean }) {
  const { removeOpeners, ...panelProps } = props;
  const [open, setOpen] = useState<ChatMessage | null>(null);

  return (
    <>
      {!(removeOpeners && open) && (
        <>
          <button type="button" onClick={() => setOpen(first)}>
            Open first
          </button>
          <button type="button" onClick={() => setOpen(second)}>
            Open second
          </button>
        </>
      )}
      <button type="button" onClick={() => setOpen(null)}>
        Hide threads
      </button>
      {open && (
        <ThreadPanel
          parent={open}
          replies={[]}
          users={users}
          currentUserId="me"
          onClose={() => setOpen(null)}
          {...panelProps}
        >
          <Composer />
        </ThreadPanel>
      )}
    </>
  );
}

const title = () => screen.getByRole('heading', { name: 'Thread' });
const close = () => userEvent.click(screen.getByRole('button', { name: 'Close thread' }));

describe('ThreadPanel focus', () => {
  it('moves focus to the title on open and back to the opener on close', async () => {
    render(<Channel />);
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }));
    expect(title()).toHaveFocus();
    expect(title()).toHaveAttribute('tabindex', '-1');

    await close();
    expect(screen.getByRole('button', { name: 'Open first' })).toHaveFocus();
  });

  it('moves focus again when another thread opens, and returns to the newest opener', async () => {
    render(<Channel />);
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open second' }));
    expect(title()).toHaveFocus();

    await close();
    expect(screen.getByRole('button', { name: 'Open second' })).toHaveFocus();
  });

  it('keeps focus where it is when the thread changes while focus is inside the panel', async () => {
    const { rerender } = render(
      <ThreadPanel parent={first} replies={[]} users={users} currentUserId="me">
        <Composer />
      </ThreadPanel>
    );
    await userEvent.click(screen.getByRole('textbox'));
    rerender(
      <>
        <ThreadPanel parent={second} replies={[]} users={users} currentUserId="me">
          <Composer />
        </ThreadPanel>
      </>
    );
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('takes no focus when it is open as the page loads', () => {
    render(<ThreadPanel parent={first} replies={[]} users={users} currentUserId="me" />);
    expect(document.body).toHaveFocus();
  });

  it('leaves focus alone when it closes while focus is outside it', async () => {
    render(<Channel />);
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide threads' }));
    expect(screen.queryByRole('heading', { name: 'Thread' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide threads' })).toHaveFocus();
  });

  it('does not return focus to an opener that is gone', async () => {
    render(<Channel removeOpeners />);
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }));
    await close();
    expect(document.body).toHaveFocus();
  });

  it('manages no focus with withFocusManagement={false}', async () => {
    render(<Channel withFocusManagement={false} />);
    const opener = screen.getByRole('button', { name: 'Open first' });
    await userEvent.click(opener);
    expect(opener).toHaveFocus();

    await close();
    expect(document.body).toHaveFocus();
  });

  it('does not close on Escape: it is not a dialog', async () => {
    render(<Channel />);
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }));
    await userEvent.keyboard('{Escape}');
    expect(title()).toBeInTheDocument();
  });
});

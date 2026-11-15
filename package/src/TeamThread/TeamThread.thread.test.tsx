import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { TeamThread, TeamThreadItem } from './TeamThread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const parent: ChatMessage = {
  id: 'p',
  authorId: 'maya',
  body: 'Launch checklist',
  createdAt: hoursAgo(5),
  thread: { count: 12, lastReplyAt: hoursAgo(2), participantIds: ['theo', 'me', 'ghost', 'maya'] },
};

const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`)!;

describe('TeamThread threads', () => {
  it('shows a thread summary under a parent and opens the thread', async () => {
    const onOpenThread = jest.fn();
    render(
      <TeamThread
        items={[parent]}
        users={users}
        currentUserId="me"
        locale="en-US"
        onOpenThread={onOpenThread}
      />
    );
    const summary = screen.getByRole('button', { name: /12 replies/ });
    expect(summary).toHaveTextContent('Last reply 2 hours ago');
    expect(summary.querySelectorAll('.mantine-Avatar-root')).toHaveLength(3);

    await userEvent.click(summary);
    expect(onOpenThread).toHaveBeenCalledWith(parent);
    await userEvent.click(
      screen.getByRole('button', { name: 'Reply in thread: Launch checklist' })
    );
    expect(onOpenThread).toHaveBeenCalledTimes(2);
  });

  it('says 1 reply as plain text without onOpenThread, and hides empty threads', () => {
    const { rerender } = render(
      <TeamThread
        items={[{ ...parent, thread: { ...parent.thread!, count: 1 } }]}
        users={users}
        currentUserId="me"
      />
    );
    expect(screen.getByText('1 reply')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1 reply/ })).not.toBeInTheDocument();

    rerender(
      <TeamThread
        items={[{ ...parent, thread: { ...parent.thread!, count: 0 } }]}
        users={users}
        currentUserId="me"
      />
    );
    expect(screen.queryByText('0 replies')).not.toBeInTheDocument();
  });

  it('in a thread: a replies divider after the parent, no summary or thread action', () => {
    const inThread: TeamThreadItem[] = [
      { ...parent, createdAt: at(1) },
      { id: 'r1', authorId: 'maya', body: 'First', createdAt: at(2), threadId: 'p' },
      { id: 'e', kind: 'event', authorId: 'theo', text: 'Theo joined', createdAt: at(3) },
      { id: 'r2', authorId: 'theo', body: 'Second', createdAt: at(4), threadId: 'p' },
    ];
    render(
      <TeamThread
        items={inThread}
        threadParentId="p"
        users={users}
        currentUserId="me"
        onOpenThread={jest.fn()}
      />
    );
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.queryByText('12 replies')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reply in thread/ })).not.toBeInTheDocument();
    expect(row('r1')).not.toHaveAttribute('data-compact');
  });

  it('marks the selected message', () => {
    render(<TeamThread items={[parent]} users={users} currentUserId="me" selectedId="p" />);
    expect(row('p')).toHaveAttribute('data-selected');
  });
});

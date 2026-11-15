import { render, screen, tests } from '@mantine-tests/core';
import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { MessageListControl } from '../MessageList/MessageList';
import type { ChatMessage, MessagesUser, SystemEvent } from '../types';
import { TeamThread, TeamThreadItem, TeamThreadProps, TeamThreadStylesNames } from './TeamThread';
import { toDate } from '../utils/dates';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const message = (
  id: string,
  authorId: string,
  minute: number,
  extra: Partial<ChatMessage> = {}
): ChatMessage => ({ id, authorId, body: `Body ${id}`, createdAt: at(minute), ...extra });

const event = (id: string, minute: number): SystemEvent => ({
  id,
  kind: 'event',
  authorId: 'theo',
  text: 'Theo joined #launch',
  createdAt: at(minute),
});

const items: TeamThreadItem[] = [event('e', 0), message('a', 'maya', 1), message('b', 'maya', 2)];
const defaultProps: TeamThreadProps = { items, users, currentUserId: 'me' };

const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`)!;

describe('TeamThread', () => {
  tests.itSupportsSystemProps<TeamThreadProps, TeamThreadStylesNames>({
    component: TeamThread,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'TeamThread',
    stylesApiSelectors: [
      'root',
      'list',
      'divider',
      'item',
      'row',
      'avatar',
      'gutterTime',
      'body',
      'meta',
      'author',
      'time',
      'text',
      'actions',
      'event',
    ],
  });

  itSupportsAttributes({
    component: TeamThread,
    props: defaultProps,
    name: 'TeamThread',
    selector: 'row',
  });

  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<TeamThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('b'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="b"]'));
    scrollIntoView.mockRestore();
  });

  it('is a live log with an event line and a name on the first message of a group', () => {
    render(<TeamThread {...defaultProps} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('Theo joined #launch')).toHaveClass('mantine-TeamThread-event');
    expect(document.querySelectorAll('.mantine-TeamThread-author')).toHaveLength(1);
    expect(row('a')).not.toHaveAttribute('data-compact');
    expect(row('b')).toHaveAttribute('data-compact');
  });

  it('gives screen readers the author of follow-ups and the time of every row', () => {
    render(<TeamThread {...defaultProps} locale="en-US" />);
    expect(row('b').querySelector('.mantine-VisuallyHidden-root')).toHaveTextContent(
      'Maya Lindqvist'
    );
    const times = Array.from(document.querySelectorAll('time')).map((time) => [
      time.getAttribute('datetime'),
      time.textContent,
    ]);
    expect(times).toEqual([
      [at(0).toISOString(), '9:00 AM'],
      [at(1).toISOString(), '9:01 AM'],
      [at(2).toISOString(), '9:02 AM'],
    ]);

    expect(screen.getByText('Theo joined #launch')).toHaveTextContent(
      'Theo joined #launch 9:00 AM'
    );
  });

  it('groups by author, time and visibility; events break groups', () => {
    render(
      <TeamThread
        {...defaultProps}
        items={[
          message('a', 'maya', 1),
          message('b', 'maya', 2),
          message('c', 'maya', 3, { visibility: 'internal' }),
          message('d', 'maya', 4, { visibility: 'internal' }),
          message('e', 'maya', 5),
          message('f', 'maya', 30),
          message('g', 'theo', 31),
          event('h', 32),
          message('i', 'theo', 33),
        ]}
      />
    );
    expect(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'i'].map((id) => row(id).hasAttribute('data-compact'))
    ).toEqual([false, true, false, true, false, false, false, false]);
  });

  it('marks internal notes and edited messages, with custom labels', () => {
    const note = message('a', 'maya', 1, { visibility: 'internal', editedAt: at(2) });
    const { rerender } = render(<TeamThread {...defaultProps} items={[note]} />);
    expect(row('a')).toHaveAttribute('data-internal');
    expect(screen.getByText('Internal note')).toBeInTheDocument();
    expect(screen.getByText('(edited)')).toBeInTheDocument();

    rerender(
      <TeamThread
        {...defaultProps}
        items={[note]}
        labels={{ internal: 'Team only', edited: '(changed)' }}
      />
    );
    expect(screen.getByText('Team only')).toBeInTheDocument();
    expect(screen.getByText('(changed)')).toBeInTheDocument();
  });

  it('falls back to the author id for unknown users', () => {
    render(<TeamThread {...defaultProps} items={[message('x', 'ghost', 1)]} />);
    expect(screen.getByText('ghost')).toBeInTheDocument();
  });

  it('shows react and thread, with edit for own messages and copy in the menu', async () => {
    const onReact = jest.fn();
    const onOpenThread = jest.fn();
    const onEdit = jest.fn();
    const own = message('m', 'me', 1);
    const other = message('o', 'maya', 30);
    render(
      <TeamThread
        {...defaultProps}
        items={[own, other]}
        onReact={onReact}
        onOpenThread={onOpenThread}
        onEdit={onEdit}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'React: Body o' }));
    expect(onReact).toHaveBeenCalledWith(other);
    await userEvent.click(screen.getByRole('button', { name: 'Reply in thread: Body o' }));
    expect(onOpenThread).toHaveBeenCalledWith(other);
    expect(screen.getByRole('button', { name: 'Copy: Body o' })).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: "Actions for Maya Lindqvist's message" })
    ).toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: /^More actions/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'More actions for your message' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(own);
  });

  it('renders again only the rows that changed', async () => {
    const formatted = jest.spyOn(Date.prototype, 'toISOString');
    const view = (list: TeamThreadItem[], onReact: (message: ChatMessage) => void) => (
      <TeamThread {...defaultProps} items={list} onReact={onReact} selectedId="b" />
    );
    // Testing Library's render: Mantine's wraps the first render in a fragment, so rerender remounts
    const { rerender } = rtlRender(view(items, jest.fn()), { wrapper: MantineProvider });

    formatted.mockClear();
    const onReact = jest.fn();
    rerender(view(items, onReact));
    expect(formatted).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'React: Body a' }));
    expect(onReact).toHaveBeenCalledWith(items[1]);

    formatted.mockClear();
    const next = message('c', 'theo', 3);
    rerender(view([...items, next], onReact));
    expect(formatted.mock.contexts).toEqual([toDate(next.createdAt)]);
    formatted.mockRestore();
  });

  it('labels actions with the plain preview, but copies the whole body', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const body = `**Bold** move ${'and more '.repeat(20)}`;
    render(
      <TeamThread
        {...defaultProps}
        actions={['copy']}
        items={[message('md', 'maya', 1, { body, format: 'markdown' })]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Copy: Bold move and more/ }));
    expect(writeText).toHaveBeenCalledWith(body);
    expect(await screen.findByRole('button', { name: /^Copied: Bold move/ })).toBeInTheDocument();
  });

  it('shows reactions and files, interactive with handlers', async () => {
    const onToggleReaction = jest.fn();
    const onOpenAttachment = jest.fn();
    const attachment = { id: 'f', name: 'notes.pdf', url: '#', size: 2048 };
    const withExtras = message('x', 'maya', 1, {
      reactions: [{ emoji: '👍', userIds: ['me'] }],
      attachments: [attachment],
    });
    render(
      <TeamThread
        {...defaultProps}
        items={[withExtras]}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: '👍 1, including you' }));
    expect(onToggleReaction).toHaveBeenCalledWith(withExtras, '👍');
    await userEvent.click(screen.getByRole('button', { name: /notes\.pdf/ }));
    expect(onOpenAttachment).toHaveBeenCalledWith(withExtras, attachment);
  });

  it('passes the unread line and history loading to the list', () => {
    const { container } = render(
      <TeamThread
        {...defaultProps}
        unreadAfterId="a"
        loadingOlder
        hasOlder
        onLoadOlder={() => {}}
        labels={{ newMessages: 'Unread', log: '#launch', loadingOlder: 'Fetching' }}
      />
    );
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(container.querySelector('.mantine-TeamThread-loader')).toBeInTheDocument();
    expect(screen.getByRole('log', { name: '#launch' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar', { name: 'Fetching' })).toBeInTheDocument();
  });
});

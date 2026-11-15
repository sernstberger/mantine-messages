import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { ChatThread } from './ChatThread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
];

const messages: ChatMessage[] = [
  {
    id: 'a',
    authorId: 'maya',
    body: 'Can you send the invoice?',
    createdAt: new Date(2026, 10, 15, 9),
  },
  {
    id: 'b',
    authorId: 'me',
    body: 'On it',
    createdAt: new Date(2026, 10, 15, 9, 1),
    replyToId: 'a',
  },
];

const renderThread = (props: Partial<React.ComponentProps<typeof ChatThread>> = {}) =>
  render(<ChatThread messages={messages} users={users} currentUserId="me" {...props} />, {
    wrapper: MantineProvider,
  });

const bubble = (id: string) => document.querySelector(`[data-message-id="${id}"]`)!;

describe('ChatThread replies', () => {
  it('shows the answered message above the reply, with a caption', () => {
    renderThread();
    expect(screen.getByText('You replied to Maya Lindqvist')).toBeInTheDocument();
    const quote = screen.getByRole('button', { name: 'Can you send the invoice?' });
    expect(bubble('b')).not.toContainElement(quote);
    expect(quote.compareDocumentPosition(bubble('b'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('words the caption for who answered whom, and can be translated', () => {
    const { rerender } = renderThread({
      messages: [
        { ...messages[0], authorId: 'me' },
        { ...messages[1], authorId: 'maya' },
      ],
    });
    expect(screen.getByText('Maya Lindqvist replied to you')).toBeInTheDocument();

    rerender(
      <ChatThread
        messages={[{ ...messages[0], authorId: 'me' }, messages[1]]}
        users={users}
        currentUserId="me"
      />
    );
    expect(screen.getByText('You replied to yourself')).toBeInTheDocument();

    rerender(
      <ChatThread
        messages={[{ ...messages[0], authorId: 'me' }, messages[1]]}
        users={users}
        currentUserId="me"
        labels={{ repliedTo: ({ own, toOwn }) => `${own}-${toOwn}` }}
      />
    );
    expect(screen.getByText('true-true')).toBeInTheDocument();
  });

  it('scrolls to the original on a click and flashes it', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    renderThread();

    fireEvent.click(screen.getByRole('button', { name: 'Can you send the invoice?' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(scrollIntoView.mock.contexts[0]).toBe(bubble('a').closest('[data-item-id]'));
    expect(bubble('a')).toHaveAttribute('data-highlighted');

    act(() => jest.advanceTimersByTime(1600));
    expect(bubble('a')).not.toHaveAttribute('data-highlighted');

    scrollIntoView.mockRestore();
    jest.useRealTimers();
  });

  it('jumps without animating when the user prefers reduced motion', () => {
    const matchMedia = jest.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }) as any
    );
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    renderThread();

    fireEvent.click(screen.getByRole('button', { name: 'Can you send the invoice?' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });

    scrollIntoView.mockRestore();
    matchMedia.mockRestore();
  });

  it('says when the original is not in the thread', () => {
    renderThread({
      messages: [{ ...messages[1], replyToId: 'gone' }],
      labels: { unavailable: 'Deleted message' },
    });
    expect(screen.getByText('Deleted message').parentElement).toHaveAttribute('data-unavailable');
  });

  it('shows a reply button per message only with onReply', () => {
    const onReply = jest.fn();
    const { rerender } = renderThread();
    expect(screen.queryByRole('button', { name: /^Reply/ })).not.toBeInTheDocument();

    rerender(
      <ChatThread
        messages={messages}
        users={users}
        currentUserId="me"
        onReply={onReply}
        labels={{ reply: 'Answer' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Answer: Can you send the invoice?' }));
    expect(onReply).toHaveBeenCalledWith(messages[0]);
  });

  it('quotes and labels markdown as plain text, cutting long labels', () => {
    const long = `**Plan:** ${'word '.repeat(30)}`;
    render(
      <ChatThread
        messages={[{ ...messages[0], body: long, format: 'markdown' }, messages[1]]}
        users={users}
        currentUserId="me"
        onReply={() => {}}
      />,
      { wrapper: MantineProvider }
    );
    // getPreview gives "Plan: word word ..." (155 characters); truncate keeps 79 plus the ellipsis
    const preview = `Plan: ${'word '.repeat(30).trim()}`;
    const label = `Reply: ${preview.slice(0, 79)}…`;
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plan: word/ })).toBeInTheDocument();
  });
  it('shows reactions, attachments and actions from the new props', async () => {
    const onReact = jest.fn();
    const onToggleReaction = jest.fn();
    const onOpenAttachment = jest.fn();
    const rich: ChatMessage[] = [
      {
        ...messages[0],
        reactions: [{ emoji: '👍', userIds: ['me'] }],
        attachments: [{ id: 'f', name: 'menu.pdf', url: '/menu.pdf' }],
      },
    ];
    render(
      <ChatThread
        messages={rich}
        users={users}
        currentUserId="me"
        onReact={onReact}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
        unreadAfterId={null}
      />,
      { wrapper: MantineProvider }
    );
    fireEvent.click(screen.getByRole('button', { name: /^React: / }));
    fireEvent.click(screen.getByRole('button', { name: '👍 1, including you' }));
    fireEvent.click(screen.getByRole('button', { name: 'menu.pdf' }));
    expect(onReact).toHaveBeenCalledWith(rich[0]);
    expect(onToggleReaction).toHaveBeenCalledWith(rich[0], '👍');
    expect(onOpenAttachment).toHaveBeenCalledWith(rich[0], rich[0].attachments![0]);
  });

  it('passes edit, the unread line and loading through', () => {
    const onEdit = jest.fn();
    render(
      <ChatThread
        messages={messages}
        users={users}
        currentUserId="me"
        onEdit={onEdit}
        unreadAfterId="a"
        loadingOlder
        hasOlder
        labels={{ newMessages: 'Unread below' }}
      />,
      { wrapper: MantineProvider }
    );
    expect(screen.getByText('Unread below')).toBeInTheDocument();
    expect(document.querySelector('.mantine-ChatThread-loader')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit: On it' }));
    expect(onEdit).toHaveBeenCalledWith(messages[1]);
  });
});

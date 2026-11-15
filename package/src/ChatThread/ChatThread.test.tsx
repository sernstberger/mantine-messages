import { render, screen, tests } from '@mantine-tests/core';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { ChatThread, ChatThreadProps, ChatThreadStylesNames } from './ChatThread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
];

const messages: ChatMessage[] = [
  { id: 'a', authorId: 'maya', body: 'Hi there', createdAt: new Date(2026, 10, 15, 9) },
  {
    id: 'b',
    authorId: 'me',
    body: 'Hello!',
    createdAt: new Date(2026, 10, 15, 9, 1),
    status: 'read',
  },
];

const defaultProps: ChatThreadProps = { messages, users, currentUserId: 'me' };

describe('ChatThread', () => {
  tests.itSupportsSystemProps<ChatThreadProps, ChatThreadStylesNames>({
    component: ChatThread,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'ChatThread',
    stylesApiSelectors: [
      'root',
      'list',
      'divider',
      'item',
      'row',
      'avatar',
      'content',
      'author',
      'line',
      'bubble',
      'meta',
      'status',
    ],
  });

  it('is a live log with a divider and every message', () => {
    render(<ChatThread {...defaultProps} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toHaveAttribute('data-own');
  });

  it('names other people but not the current user', () => {
    render(<ChatThread {...defaultProps} />);
    expect(screen.getByText('Maya Lindqvist')).toBeInTheDocument();
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('shows the status of the last own message, with custom labels', () => {
    render(<ChatThread {...defaultProps} labels={{ read: 'Seen' }} />);
    expect(screen.getByText('Seen', { exact: false })).toHaveAttribute('data-status', 'read');
  });

  it('falls back to the author id when the user is unknown, and hides authors on request', () => {
    const { rerender } = render(
      <ChatThread {...defaultProps} messages={[{ ...messages[0], authorId: 'ghost' }]} />
    );
    expect(screen.getByText('ghost')).toBeInTheDocument();

    rerender(<ChatThread {...defaultProps} withAuthors={false} />);
    expect(screen.queryByText('Maya Lindqvist')).not.toBeInTheDocument();
  });

  it('shows no status when own messages have none', () => {
    render(<ChatThread {...defaultProps} messages={[{ ...messages[1], status: undefined }]} />);
    expect(screen.queryByText('Read', { exact: false })).not.toBeInTheDocument();
  });
  it('renders bodies through renderBody, for example markdown', () => {
    render(
      <ChatThread
        {...defaultProps}
        renderBody={(message) => (
          <strong data-testid={`body-${message.id}`}>{message.body.toUpperCase()}</strong>
        )}
      />
    );
    expect(screen.getByTestId('body-a')).toHaveTextContent('HI THERE');
    expect(screen.getByTestId('body-a').closest('.mantine-ChatThread-bubble')).toBeInTheDocument();
  });
});

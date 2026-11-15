import { render, screen, tests } from '@mantine-tests/core';
import { MantineProvider } from '@mantine/core';
import { act, render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { MessageListControl } from '../MessageList/MessageList';
import type { ChatMessage, MessagesUser } from '../types';
import { ChatThread, ChatThreadProps, ChatThreadStylesNames } from './ChatThread';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

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

  itSupportsAttributes({
    component: ChatThread,
    props: defaultProps,
    name: 'ChatThread',
    selector: 'bubble',
  });

  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<ChatThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('a'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="a"]'));
    scrollIntoView.mockRestore();
  });

  it('names the log and the history loader from its labels', () => {
    render(
      <ChatThread
        {...defaultProps}
        loadingOlder
        labels={{ log: 'Chat with Maya', loadingOlder: 'Fetching' }}
      />
    );
    expect(screen.getByRole('log', { name: 'Chat with Maya' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByRole('progressbar', { name: 'Fetching' })).toBeInTheDocument();
  });

  it('is a live log with a divider and every message', () => {
    render(<ChatThread {...defaultProps} />);
    expect(screen.getByRole('log', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toHaveAttribute('data-own');
  });

  it('names other people but not the current user', () => {
    render(<ChatThread {...defaultProps} />);
    expect(screen.getByText('Maya Lindqvist')).toBeInTheDocument();
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('renders again only the rows that changed', async () => {
    const renderBody = jest.fn((message: ChatMessage) => message.body);
    const first = jest.fn();
    const view = (list: ChatMessage[], onReply?: (message: ChatMessage) => void) => (
      <ChatThread {...defaultProps} messages={list} renderBody={renderBody} onReply={onReply} />
    );
    // Testing Library's render: Mantine's wraps the first render in a fragment, so rerender remounts
    const { rerender } = rtlRender(view(messages, first), { wrapper: MantineProvider });
    expect(renderBody).toHaveBeenCalledTimes(2);

    const second = jest.fn();
    rerender(view(messages, second));
    expect(renderBody).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole('button', { name: 'Reply: Hi there' }));
    expect(second).toHaveBeenCalledWith(messages[0]);
    expect(first).not.toHaveBeenCalled();

    renderBody.mockClear();
    const reply: ChatMessage = {
      id: 'c',
      authorId: 'maya',
      body: 'Great',
      createdAt: new Date(2026, 10, 15, 9, 2),
      replyToId: 'b',
    };
    rerender(view([...messages, reply], second));
    expect(renderBody.mock.calls.map(([message]) => message.id)).toEqual(['c']);

    rerender(view([...messages, reply]));
    expect(screen.queryByRole('button', { name: /^Reply:/ })).not.toBeInTheDocument();
  });

  it('says who wrote each message and when, for screen readers', () => {
    const at = (minute: number) => new Date(2026, 10, 15, 9, minute);
    render(
      <ChatThread
        {...defaultProps}
        locale="en-US"
        labels={{ you: 'Du' }}
        messages={[
          { id: 'a1', authorId: 'maya', body: 'One', createdAt: at(0) },
          { id: 'a2', authorId: 'maya', body: 'Two', createdAt: at(1) },
          { id: 'm1', authorId: 'me', body: 'Mine', createdAt: at(2) },
        ]}
      />
    );
    const hidden = (id: string) =>
      Array.from(
        document
          .querySelector(`[data-item-id="${id}"]`)!
          .querySelectorAll('.mantine-VisuallyHidden-root')
      ).map((element) => element.textContent);

    expect(hidden('a1')).toEqual([' 9:00 AM']);
    expect(hidden('a2')).toEqual(['Maya Lindqvist: ']);
    expect(hidden('m1')).toEqual(['Du: ']);

    const times = Array.from(document.querySelectorAll('time')).map((time) => [
      time.getAttribute('datetime'),
      time.textContent,
    ]);
    expect(times).toEqual([
      [at(0).toISOString(), '9:00 AM'],
      [at(1).toISOString(), '9:01 AM'],
      [at(2).toISOString(), '9:02 AM'],
    ]);
  });

  it('says sending and failed under every own message, other statuses only under the last', () => {
    const at = (minute: number) => new Date(2026, 10, 15, 9, minute);
    const own = (id: string, minute: number, status: ChatMessage['status']): ChatMessage => ({
      id,
      authorId: 'me',
      body: `Body ${id}`,
      createdAt: at(minute),
      status,
    });
    render(
      <ChatThread
        {...defaultProps}
        messages={[
          own('f', 0, 'failed'),
          own('s', 1, 'sending'),
          own('d', 2, 'delivered'),
          own('r', 3, 'read'),
        ]}
      />
    );
    const status = (id: string) =>
      document.querySelector(`[data-item-id="${id}"] .mantine-ChatThread-status`)?.textContent;
    expect(status('f')).toBe('Not sent');
    expect(status('s')).toBe('Sending');
    expect(status('d')).toBeUndefined();
    expect(status('r')).toBe(' · Read');
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

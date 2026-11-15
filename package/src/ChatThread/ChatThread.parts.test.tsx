import { render, screen, tests } from '@mantine-tests/core';
import { MantineProvider } from '@mantine/core';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { ChatThread, ChatThreadMessageContext, ChatThreadProps } from './ChatThread';
import { getRenderError } from '../../../test-utils/get-render-error';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const messages: ChatMessage[] = [
  {
    id: 'a',
    authorId: 'maya',
    body: 'Lunch?',
    createdAt: at(0),
    reactions: [{ emoji: '👍', userIds: ['me'] }],
    attachments: [{ id: 'f', name: 'menu.pdf', url: '/menu.pdf' }],
  },
  { id: 'b', authorId: 'me', body: 'Yes!', createdAt: at(1), replyToId: 'a', status: 'read' },
];

const defaultProps: ChatThreadProps = { messages, users, currentUserId: 'me', locale: 'en-US' };

const customRow: ChatThreadProps['renderMessage'] = (message, context) => (
  <ChatThread.Message
    message={message}
    context={context}
    avatar={null}
    className="custom-row"
    data-testid={`row-${message.id}`}
  >
    <ChatThread.Quote classNames={{ quoteLabel: 'custom-label' }} />
    <ChatThread.Bubble
      className="custom-bubble"
      actions={<ChatThread.Actions actions={['copy']} className="custom-actions" />}
    >
      <em>{message.body.toUpperCase()}</em>
    </ChatThread.Bubble>
    <ChatThread.Reactions className="custom-reactions" />
    <ChatThread.Attachments className="custom-attachments" />
    <ChatThread.Meta className="custom-meta" />
  </ChatThread.Message>
);

describe('ChatThread parts', () => {
  tests.axe([<ChatThread {...defaultProps} renderMessage={customRow} />]);

  it('renders a custom row built from the parts, styled through the thread', () => {
    const { container } = render(
      <ChatThread {...defaultProps} renderMessage={customRow} classNames={{ bubble: 'themed' }} />
    );
    const row = screen.getByTestId('row-a');
    expect(row).toHaveClass('custom-row', 'mantine-ChatThread-row');
    expect(row.querySelector('.mantine-ChatThread-avatar')).not.toBeInTheDocument();
    expect(row.querySelector('.mantine-ChatThread-author')).toHaveTextContent('Maya Lindqvist');

    const bubble = screen.getByText('LUNCH?').closest('.mantine-ChatThread-bubble')!;
    expect(bubble).toHaveClass('custom-bubble', 'themed');
    expect(bubble).toHaveAttribute('data-message-id', 'a');
    expect(row.querySelector('.custom-actions')).toHaveClass('mantine-ChatThread-actions');
    expect(screen.getAllByRole('button', { name: /^Copy:/ })).toHaveLength(2);
    expect(row.querySelector('.custom-reactions')).toHaveClass('mantine-ChatThread-reactions');
    expect(row.querySelector('.custom-attachments')).toHaveClass('mantine-ChatThread-attachments');
    expect(container.querySelector('.custom-label')).toHaveClass('mantine-ChatThread-quoteLabel');
    expect(screen.getByTestId('row-b').querySelector('.custom-meta')).toHaveTextContent(
      '9:01 AM · Read'
    );
  });

  it('calls renderMessage with each message and where it sits', () => {
    const renderMessage = jest.fn(() => null);
    render(<ChatThread {...defaultProps} renderMessage={renderMessage} />);
    expect(renderMessage).toHaveBeenCalledWith(messages[1], {
      original: messages[0],
      own: true,
      groupStart: true,
      groupEnd: true,
      highlighted: false,
      lastOwn: true,
      jumpTo: expect.any(Function),
    } satisfies ChatThreadMessageContext);
  });

  it('jumps to the original from a custom quote', async () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    render(<ChatThread {...defaultProps} renderMessage={customRow} />);
    await userEvent.click(screen.getByText('Lunch?', { selector: 'p' }));
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.querySelector('[data-item-id="a"]'));
    scrollIntoView.mockRestore();
  });

  it('renders a bubble without actions when actions is null', () => {
    render(
      <ChatThread
        {...defaultProps}
        onReply={() => {}}
        renderMessage={(message, context) => (
          <ChatThread.Message message={message} context={context}>
            <ChatThread.Bubble actions={null} />
          </ChatThread.Message>
        )}
      />
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.getByText('Lunch?')).toHaveClass('mantine-ChatThread-bubble');
  });

  it('renders custom rows again only when they change', () => {
    const renderMessage = jest.fn(customRow);
    const view = (list: ChatMessage[]) => (
      <ChatThread {...defaultProps} messages={list} renderMessage={renderMessage} />
    );
    const { rerender } = rtlRender(view(messages), { wrapper: MantineProvider });
    expect(renderMessage).toHaveBeenCalledTimes(2);
    rerender(view(messages));
    expect(renderMessage).toHaveBeenCalledTimes(2);
  });

  tests.itThrowsContextError(
    {
      component: ChatThread.Message,
      props: { message: messages[0], context: {} as ChatThreadMessageContext },
      error: 'ChatThread component was not found in tree',
    },
    'ChatThread.Message throws outside ChatThread'
  );

  const parts: Record<string, React.ComponentType> = {
    Avatar: ChatThread.Avatar,
    Quote: ChatThread.Quote,
    Bubble: ChatThread.Bubble,
    Actions: ChatThread.Actions,
    Attachments: ChatThread.Attachments,
    Reactions: ChatThread.Reactions,
    Meta: ChatThread.Meta,
  };

  for (const [name, Part] of Object.entries(parts)) {
    tests.itThrowsContextError(
      { component: Part, props: {}, error: 'ChatThread component was not found in tree' },
      `ChatThread.${name} throws outside ChatThread`
    );

    it(`ChatThread.${name} throws outside ChatThread.Message`, () => {
      expect(
        getRenderError(<ChatThread {...defaultProps} renderMessage={() => <Part />} />)
      ).toHaveProperty('message', 'ChatThread.Message component was not found in tree');
    });
  }
});

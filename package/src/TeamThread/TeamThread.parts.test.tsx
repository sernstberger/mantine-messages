import { render, screen, tests } from '@mantine-tests/core';
import { MantineProvider } from '@mantine/core';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ChatMessage, MessagesUser, SystemEvent } from '../types';
import {
  TeamThread,
  TeamThreadItem,
  TeamThreadMessageContext,
  TeamThreadProps,
} from './TeamThread';
import { getRenderError } from '../../../test-utils/get-render-error';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const event: SystemEvent = {
  id: 'e',
  kind: 'event',
  authorId: 'maya',
  text: 'Maya joined #launch',
  createdAt: at(0),
};

const parent: ChatMessage = {
  id: 'a',
  authorId: 'maya',
  body: 'Launch **today**',
  createdAt: at(1),
  editedAt: at(2),
  visibility: 'internal',
  reactions: [{ emoji: '👍', userIds: ['me'] }],
  attachments: [{ id: 'f', name: 'plan.pdf', url: '/plan.pdf' }],
  thread: { count: 2, lastReplyAt: at(3), participantIds: ['me'] },
};

const items: TeamThreadItem[] = [
  event,
  parent,
  { id: 'b', authorId: 'me', body: 'On it', createdAt: at(2) },
];

const defaultProps: TeamThreadProps = { items, users, currentUserId: 'me', locale: 'en-US' };

const customRow: TeamThreadProps['renderMessage'] = (item, context) =>
  'kind' in item ? (
    <TeamThread.Event event={item} className="custom-event" />
  ) : (
    <TeamThread.Message
      message={item}
      context={context}
      className="custom-row"
      actions={<TeamThread.Actions actions={['copy']} className="custom-actions" />}
    >
      <TeamThread.Author className="custom-author" />
      <TeamThread.Text className="custom-text">
        <em>{item.body.toUpperCase()}</em>
      </TeamThread.Text>
      <TeamThread.Attachments className="custom-attachments" />
      <TeamThread.Reactions className="custom-reactions" />
      <TeamThread.ThreadSummary className="custom-summary" />
    </TeamThread.Message>
  );

const row = (id: string) => document.querySelector<HTMLElement>(`[data-message-id="${id}"]`)!;

describe('TeamThread parts', () => {
  tests.axe([<TeamThread {...defaultProps} renderMessage={customRow} />]);

  it('renders a custom row built from the parts, styled through the thread', () => {
    render(
      <TeamThread {...defaultProps} renderMessage={customRow} classNames={{ text: 'themed' }} />
    );
    expect(row('a')).toHaveClass('custom-row', 'mantine-TeamThread-row');
    expect(row('a')).toHaveAttribute('data-internal');
    expect(row('a').querySelector('.custom-author')).toHaveTextContent('Maya Lindqvist9:01 AM');
    expect(screen.getByText('LAUNCH **TODAY**').parentElement).toHaveClass(
      'custom-text',
      'themed',
      'mantine-TeamThread-text'
    );
    expect(row('a')).toHaveTextContent('Internal note');
    expect(row('a')).toHaveTextContent('(edited)');
    expect(row('a').querySelector('.custom-attachments')).toHaveClass(
      'mantine-TeamThread-attachments'
    );
    expect(row('a').querySelector('.custom-reactions')).toHaveClass('mantine-TeamThread-reactions');
    expect(row('a').querySelector('.custom-summary')).toHaveTextContent('2 replies');
    expect(row('a').querySelector('.custom-actions')).toHaveClass('mantine-TeamThread-actions');
    expect(screen.getAllByRole('button', { name: /^Copy:/ })).toHaveLength(2);
    expect(screen.getByText('Maya joined #launch')).toHaveClass(
      'custom-event',
      'mantine-TeamThread-event'
    );
  });

  it('opens the thread from a custom summary', async () => {
    const onOpenThread = jest.fn();
    render(<TeamThread {...defaultProps} renderMessage={customRow} onOpenThread={onOpenThread} />);
    await userEvent.click(screen.getByRole('button', { name: /2 replies/ }));
    expect(onOpenThread).toHaveBeenCalledWith(parent);
  });

  it('renders text through renderBody, for example markdown', () => {
    render(
      <TeamThread
        {...defaultProps}
        renderBody={(message) => <strong data-testid={`body-${message.id}`}>{message.body}</strong>}
      />
    );
    expect(screen.getByTestId('body-a').closest('.mantine-TeamThread-text')).toBeInTheDocument();
  });

  it('calls renderMessage with each item and where it sits', () => {
    const renderMessage = jest.fn(() => null);
    render(<TeamThread {...defaultProps} selectedId="a" renderMessage={renderMessage} />);
    expect(renderMessage).toHaveBeenCalledWith(event, expect.objectContaining({ own: false }));
    expect(renderMessage).toHaveBeenCalledWith(parent, {
      own: false,
      groupStart: true,
      groupEnd: true,
      highlighted: false,
      selected: true,
      jumpTo: expect.any(Function),
    } satisfies TeamThreadMessageContext);
  });

  it('renders a row without actions when actions is null', () => {
    render(
      <TeamThread
        {...defaultProps}
        onReact={() => {}}
        renderMessage={(item, context) =>
          'kind' in item ? null : (
            <TeamThread.Message message={item} context={context} actions={null} />
          )
        }
      />
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(row('a')).toHaveTextContent('Launch **today**');
  });

  it('renders custom rows again only when they change', () => {
    const renderMessage = jest.fn(customRow);
    const view = (list: TeamThreadItem[]) => (
      <TeamThread {...defaultProps} items={list} renderMessage={renderMessage} />
    );
    const { rerender } = rtlRender(view(items), { wrapper: MantineProvider });
    expect(renderMessage).toHaveBeenCalledTimes(3);
    rerender(view(items));
    expect(renderMessage).toHaveBeenCalledTimes(3);
  });

  tests.itThrowsContextError(
    {
      component: TeamThread.Message,
      props: { message: parent, context: {} as TeamThreadMessageContext },
      error: 'TeamThread component was not found in tree',
    },
    'TeamThread.Message throws outside TeamThread'
  );

  tests.itThrowsContextError(
    {
      component: TeamThread.Event,
      props: { event },
      error: 'TeamThread component was not found in tree',
    },
    'TeamThread.Event throws outside TeamThread'
  );

  for (const [name, Part] of Object.entries({
    Author: TeamThread.Author,
    Text: TeamThread.Text,
    Attachments: TeamThread.Attachments,
    Reactions: TeamThread.Reactions,
    ThreadSummary: TeamThread.ThreadSummary,
    Actions: TeamThread.Actions,
  })) {
    tests.itThrowsContextError(
      { component: Part, props: {}, error: 'TeamThread component was not found in tree' },
      `TeamThread.${name} throws outside TeamThread`
    );

    it(`TeamThread.${name} throws outside TeamThread.Message`, () => {
      expect(
        getRenderError(<TeamThread {...defaultProps} renderMessage={() => <Part />} />)
      ).toHaveProperty('message', 'TeamThread.Message component was not found in tree');
    });
  }
});

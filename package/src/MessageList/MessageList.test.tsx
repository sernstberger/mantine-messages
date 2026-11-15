import { MantineProvider } from '@mantine/core';
import { tests } from '@mantine-tests/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { MessageBase } from '../types';
import {
  MessageList,
  MessageListBase,
  MessageListProps,
  MessageListStylesNames,
} from './MessageList';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

interface Note extends MessageBase {
  text: string;
}

const note = (id: string, authorId: string, day: number, minute = 0): Note => ({
  id,
  authorId,
  createdAt: new Date(2026, 10, day, 9, minute),
  text: `note ${id}`,
});

const items = [
  note('a', 'maya', 14),
  note('b', 'maya', 15),
  note('c', 'maya', 15, 1),
  note('d', 'me', 15, 2),
];

const renderList = (props: Partial<MessageListProps<Note>> = {}) =>
  render(
    <MessageList<Note>
      items={items}
      renderItem={(item, context) => (
        <span data-testid={item.id} data-start={context.groupStart} data-end={context.groupEnd}>
          {item.text}
        </span>
      )}
      {...props}
    />,
    { wrapper: MantineProvider }
  );

describe('MessageList', () => {
  tests.itSupportsSystemProps<MessageListProps, MessageListStylesNames>({
    component: MessageListBase,
    props: { items, renderItem: (item: MessageBase) => item.id },
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MessageList',
    stylesApiSelectors: ['root', 'list', 'divider', 'item'],
  });

  itSupportsAttributes({
    component: MessageListBase,
    props: { items, renderItem: (item: MessageBase) => item.id },
    name: 'MessageList',
    selector: 'item',
  });

  it('renders every item in a live log, wrapped with its id', () => {
    renderList();
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('c').closest('[data-item-id]')).toHaveAttribute('data-item-id', 'c');
  });

  it('adds a divider for each new day, unless turned off', () => {
    const { rerender } = renderList();
    expect(screen.getAllByRole('separator')).toHaveLength(2);
    rerender(
      <MantineProvider>
        <MessageList<Note>
          items={items}
          renderItem={(item) => item.text}
          withDateDividers={false}
        />
      </MantineProvider>
    );
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
  });

  it('marks group starts and ends with groupWith, breaking groups at new days', () => {
    renderList({ groupWith: (previous, item) => previous.authorId === item.authorId });
    const flags = (id: string) => [
      screen.getByTestId(id).dataset.start,
      screen.getByTestId(id).dataset.end,
    ];
    expect(flags('a')).toEqual(['true', 'true']);
    expect(flags('b')).toEqual(['true', 'false']);
    expect(flags('c')).toEqual(['false', 'true']);
    expect(flags('d')).toEqual(['true', 'true']);
  });

  it('treats every item as its own group without groupWith', () => {
    renderList({ withDateDividers: false });
    expect(screen.getByTestId('c').dataset.start).toBe('true');
    expect(screen.getByTestId('b').dataset.end).toBe('true');
  });

  it('draws the unread line after the given item, but not after the last', () => {
    const { rerender } = renderList({ unreadAfterId: 'b', labels: { unread: 'Unread' } });
    const line = screen.getByText('Unread');
    expect(screen.getByTestId('b').compareDocumentPosition(line)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    rerender(
      <MantineProvider>
        <MessageList<Note> items={items} renderItem={(item) => item.text} unreadAfterId="d" />
      </MantineProvider>
    );
    expect(screen.queryByText('New messages')).not.toBeInTheDocument();
  });

  it('shows a loader at the top while older items load', () => {
    const { container } = renderList({ loadingOlder: true, hasOlder: true });
    expect(container.querySelector('.mantine-MessageList-loader')).toBeInTheDocument();
  });
});

import { Divider, Loader, MantineProvider, ScrollArea } from '@mantine/core';
import { tests } from '@mantine-tests/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { MessageBase } from '../types';
import { MessageList, MessageListProps, MessageListStylesNames } from './MessageList';
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
  it('types renderItem with the item type, and takes a ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <MessageList<Note>
        ref={ref}
        items={items}
        // @ts-expect-error: Note has no `title`, so the generic reached renderItem
        renderItem={(item) => item.title}
      />,
      { wrapper: MantineProvider }
    );
    expect(ref.current).toHaveClass('mantine-MessageList-root');
  });

  tests.itSupportsSystemProps<MessageListProps, MessageListStylesNames>({
    component: MessageList,
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
    component: MessageList,
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
    const { rerender } = renderList({ unreadAfterId: 'b', labels: { newMessages: 'Unread' } });
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

  it('shows a labelled loader at the top while older items load', () => {
    const { container } = renderList({
      loadingOlder: true,
      hasOlder: true,
      labels: { loadingOlder: 'Fetching history' },
    });
    expect(container.querySelector('.mantine-MessageList-loader')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Fetching history' })).toBeInTheDocument();
  });

  it('passes unstyled to its loader and dividers', () => {
    const { container } = renderList({
      loadingOlder: true,
      hasOlder: true,
      unreadAfterId: 'b',
      unstyled: true,
    });
    const parts = [Loader, Divider].map((Component) => ({
      Component,
      elements: [
        ...container.querySelectorAll(`.mantine-${Component.displayName!.split('/').pop()}-root`),
      ],
    }));
    for (const { Component, elements } of parts) {
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect(element).not.toHaveClass(Component.classes.root);
      }
    }
  });

  it('passes unstyled to its scroll area', () => {
    const { container } = renderList({ unstyled: true });
    const root = container.querySelector('.mantine-ScrollArea-root')!;
    expect(root).toBeInTheDocument();
    expect(root).not.toHaveClass(ScrollArea.classes.root);
  });

  it('names the log, from labels or aria-label', () => {
    const { rerender } = renderList();
    expect(screen.getByRole('log', { name: 'Messages' })).toBeInTheDocument();
    rerender(
      <MantineProvider>
        <MessageList<Note> items={items} renderItem={(item) => item.text} aria-label="Chat" />
      </MantineProvider>
    );
    expect(screen.getByRole('log', { name: 'Chat' })).toBeInTheDocument();
    rerender(
      <MantineProvider>
        <MessageList<Note>
          items={items}
          renderItem={(item) => item.text}
          labels={{ log: 'Verlauf' }}
        />
      </MantineProvider>
    );
    expect(screen.getByRole('log', { name: 'Verlauf' })).toBeInTheDocument();
  });

  it('is aria-busy while older items load and in the commit that prepends them', () => {
    const busyWhenMounted: Record<string, string | null> = {};
    function Probe({ id }: { id: string }) {
      const ref = React.useRef<HTMLSpanElement>(null);
      React.useLayoutEffect(() => {
        busyWhenMounted[id] = ref.current!.closest('[role="log"]')!.getAttribute('aria-busy');
      }, [id]);
      return <span ref={ref}>{id}</span>;
    }
    const renderItem = (item: Note) => <Probe id={item.id} />;
    const later = items.slice(1);
    const view = (list: Note[], loadingOlder: boolean) => (
      <MantineProvider>
        <MessageList<Note> items={list} renderItem={renderItem} loadingOlder={loadingOlder} />
      </MantineProvider>
    );
    const { rerender } = render(view(later, false));
    const log = screen.getByRole('log');
    expect(log).not.toHaveAttribute('aria-busy');

    rerender(view(later, true));
    expect(log).toHaveAttribute('aria-busy', 'true');

    rerender(view(items, false));
    expect(busyWhenMounted.a).toBe('true');
    expect(log).not.toHaveAttribute('aria-busy');

    rerender(view([...items, note('e', 'me', 15, 3)], false));
    expect(busyWhenMounted.e).toBeNull();
  });

  it('renders an item again only when it or its context changed, with a stable renderItem', () => {
    const renderItem = jest.fn((item: Note) => item.text);
    const groupWith = () => true;
    const view = (list: Note[], extra?: string) => (
      <MantineProvider>
        <MessageList<Note>
          items={list}
          renderItem={renderItem}
          groupWith={groupWith}
          withDateDividers={false}
          className={extra}
        />
      </MantineProvider>
    );
    const { rerender } = render(view(items));
    expect(renderItem).toHaveBeenCalledTimes(4);

    rerender(view(items, 'other'));
    expect(renderItem).toHaveBeenCalledTimes(4);

    renderItem.mockClear();
    rerender(view([...items, note('e', 'me', 15, 3)]));
    expect(renderItem.mock.calls.map(([item]) => item.id)).toEqual(['d', 'e']);
  });

  it('renders every item again when renderItem changes', () => {
    const view = (renderItem: (item: Note) => string) => (
      <MantineProvider>
        <MessageList<Note> items={items} renderItem={renderItem} />
      </MantineProvider>
    );
    const first = jest.fn((item: Note) => item.text);
    const { rerender } = render(view(first));
    const second = jest.fn((item: Note) => item.text);
    rerender(view(second));
    expect(second).toHaveBeenCalledTimes(4);
  });
});

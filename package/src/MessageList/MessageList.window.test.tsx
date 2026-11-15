import { MantineProvider } from '@mantine/core';
import { act, render, screen } from '@testing-library/react';
import React, { useImperativeHandle, useState } from 'react';
import { getRenderError } from '../../../test-utils/get-render-error';
import type { MessageBase } from '../types';
import { dayNumber } from '../utils/format';
import {
  MessageList,
  MessageListHandlers,
  MessageListProps,
  MessageListRowsProps,
} from './MessageList';
import { useMessageList } from './use-message-list';

const item = (id: string, day: number): MessageBase => ({
  id,
  authorId: 'maya',
  createdAt: new Date(2026, 10, day, 9),
});

const items = [item('a', 14), item('b', 15), item('c', 15), item('d', 15)];
const scrollToIndex = jest.fn();
const seen: MessageListRowsProps[] = [];

/** Renders the last `size` rows, and the rows from an index after `scrollToIndex` */
function makeWindow(size: number, mountAfterScroll = true) {
  return function WindowRows(props: MessageListRowsProps) {
    const { rows, handlersRef } = props;
    seen.push(props);
    const [start, setStart] = useState(rows.length - size);
    useImperativeHandle(handlersRef, () => ({
      scrollToIndex: (index) => {
        scrollToIndex(index);
        if (mountAfterScroll) {
          setStart(index);
        }
      },
    }));

    return (
      <div data-testid="window">
        {rows.slice(start, start + size).map((row, offset) => (
          <MessageList.Row
            key={row.key}
            row={row}
            data-index={start + offset}
            style={{ transform: `translateY(${(start + offset) * 10}px)` }}
          />
        ))}
      </div>
    );
  };
}

function setup(props: Partial<MessageListProps> = {}) {
  const control = React.createRef<MessageListHandlers>();
  const view = render(
    <MessageList
      items={items}
      handlersRef={control}
      unreadAfterId="b"
      renderItem={(entry, context) => (
        <span data-highlighted={context.highlighted}>{entry.id}</span>
      )}
      {...props}
    />,
    { wrapper: MantineProvider }
  );
  return { control, ...view };
}

beforeEach(() => {
  scrollToIndex.mockClear();
  seen.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('MessageList windowing', () => {
  it('gives rowsComponent every row, keyed by id, and the viewport', () => {
    setup({ rowsComponent: makeWindow(2) });
    const { rows, viewportRef } = seen[seen.length - 1];
    expect(rows.map((row) => `${row.type}:${row.key}`)).toEqual([
      `divider:day:${dayNumber(items[0].createdAt)}`,
      'item:a',
      `divider:day:${dayNumber(items[1].createdAt)}`,
      'item:b',
      'unread:unread',
      'item:c',
      'item:d',
    ]);
    expect(viewportRef.current).toHaveClass('mantine-ScrollArea-viewport');
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.getByText('d')).toBeInTheDocument();
  });

  it('positions rows with style and data attributes, whatever their type', () => {
    setup({ rowsComponent: makeWindow(7) });
    const window = screen.getByTestId('window');
    expect(window.children).toHaveLength(7);
    expect(screen.getByRole('log')).toContainElement(window);
    expect(window.children[0]).toHaveClass('mantine-MessageList-divider');
    expect(window.children[4]).toHaveClass('mantine-MessageList-unread');
    expect(window.children[4]).toHaveTextContent('New messages');
    expect(window.children[5]).toHaveAttribute('data-item-id', 'c');
    expect(window.children[5]).toHaveAttribute('data-index', '5');
    expect(window.children[5]).toHaveStyle({ transform: 'translateY(50px)' });
  });

  it('jumps to a row that is not rendered: scrolls to its index, waits for it, then focuses and flashes it', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const { control } = setup({ rowsComponent: makeWindow(2) });
    act(() => control.current!.jumpTo('a'));
    expect(scrollToIndex).toHaveBeenCalledWith(1);

    act(() => jest.advanceTimersByTime(16));
    const target = document.querySelector<HTMLElement>('[data-item-id="a"]')!;
    expect(scrollIntoView.mock.contexts[0]).toBe(target);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(target).toHaveFocus();
    expect(screen.getByText('a')).toHaveAttribute('data-highlighted', 'true');
  });

  it('stops waiting after a second when the row never mounts, and on unmount', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const querySelectorAll = jest.spyOn(HTMLElement.prototype, 'querySelectorAll');
    const { control, unmount } = setup({ rowsComponent: makeWindow(2, false) });
    act(() => control.current!.jumpTo('a'));
    querySelectorAll.mockClear();
    act(() => jest.advanceTimersByTime(5000));
    expect(querySelectorAll).toHaveBeenCalledTimes(60);

    act(() => control.current!.jumpTo('b'));
    querySelectorAll.mockClear();
    unmount();
    act(() => jest.advanceTimersByTime(1000));
    expect(querySelectorAll).not.toHaveBeenCalled();
  });

  it('cancels a pending jump when another starts', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const { control } = setup({ rowsComponent: makeWindow(2, false) });
    act(() => control.current!.jumpTo('a'));
    act(() => control.current!.jumpTo('d', { focus: false }));
    const querySelectorAll = jest.spyOn(HTMLElement.prototype, 'querySelectorAll');
    act(() => jest.advanceTimersByTime(5000));
    expect(querySelectorAll).not.toHaveBeenCalled();
  });

  it('only flashes an unknown id or a list without rowsComponent handlers', () => {
    const { control } = setup({ rowsComponent: makeWindow(2) });
    act(() => control.current!.jumpTo('missing'));
    expect(scrollToIndex).not.toHaveBeenCalled();

    function NoHandlers({ rows }: MessageListRowsProps) {
      return <MessageList.Row row={rows[rows.length - 1]} />;
    }
    const other = setup({ rowsComponent: NoHandlers });
    expect(() => act(() => other.control.current!.jumpTo('a'))).not.toThrow();
  });

  it('throws when MessageList.Row is used outside a MessageList', () => {
    expect(
      getRenderError(<MessageList.Row row={{ type: 'unread', key: 'unread' }} />)
    ).toHaveProperty(
      'message',
      'MessageList.Row must be used inside the rowsComponent of MessageList'
    );
  });
});

describe('useMessageList without rows', () => {
  it('flashes an item that is not rendered, without asking for its row', () => {
    const jump = React.createRef<(id: string) => void>();
    function List() {
      const { viewportRef, jumpTo, highlightedId } = useMessageList({
        autoScroll: false,
        lastIsOwn: false,
      });
      useImperativeHandle(jump, () => jumpTo);
      return (
        <div ref={viewportRef} data-highlighted={highlightedId}>
          <div />
        </div>
      );
    }
    const { container } = render(<List />);
    act(() => jump.current!('a'));
    expect(container.firstChild).toHaveAttribute('data-highlighted', 'a');
  });
});

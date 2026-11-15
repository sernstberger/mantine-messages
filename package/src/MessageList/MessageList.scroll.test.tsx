import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { MessageBase } from '../types';
import { MessageList, MessageListControl, MessageListProps } from './MessageList';

const item = (id: string, authorId = 'maya'): MessageBase => ({
  id,
  authorId,
  createdAt: new Date(2026, 10, 15, 9),
});

const start = [item('b'), item('c')];
const scrollTo = jest.fn();
let height = 1000;
let now = 0;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 200 });
  HTMLElement.prototype.scrollTo = scrollTo;
});

afterAll(() => {
  delete (HTMLElement.prototype as any).scrollHeight;
  delete (HTMLElement.prototype as any).clientHeight;
});

beforeEach(() => {
  scrollTo.mockClear();
  height = 1000;
  now = 10_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => jest.restoreAllMocks());

function setup(props: Partial<MessageListProps> = {}, items = start) {
  const renderItem = (entry: MessageBase) => <span>{entry.id}</span>;
  const view = render(<MessageList items={items} renderItem={renderItem} {...props} />, {
    wrapper: MantineProvider,
  });
  const viewport = view.container.querySelector<HTMLDivElement>('.mantine-ScrollArea-viewport')!;
  const rerender = (next: MessageBase[], nextProps: Partial<MessageListProps> = props) =>
    view.rerender(<MessageList items={next} renderItem={renderItem} {...nextProps} />);
  const userScrollsTo = (top: number) => {
    now += 1000;
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      writable: true,
      value: top,
    });
    fireEvent.scroll(viewport);
  };
  return { rerender, userScrollsTo, viewport };
}

describe('MessageList scrolling', () => {
  it('keeps the view steady when older items are prepended', () => {
    const { rerender, userScrollsTo, viewport } = setup();
    userScrollsTo(50);
    height = 1600;
    rerender([item('older'), ...start]);
    expect(viewport.scrollTop).toBe(650);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('asks for older items near the top only when there are some and none are loading', () => {
    const onLoadOlder = jest.fn();
    const { userScrollsTo, rerender } = setup({ onLoadOlder, hasOlder: true });
    userScrollsTo(500);
    expect(onLoadOlder).not.toHaveBeenCalled();
    userScrollsTo(100);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    rerender(start, { onLoadOlder, hasOlder: true, loadingOlder: true });
    userScrollsTo(0);
    rerender(start, { onLoadOlder, hasOlder: false });
    userScrollsTo(0);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('follows a new item at the bottom and opens at the bottom', () => {
    const { rerender, userScrollsTo } = setup({ isOwn: (entry) => entry.authorId === 'me' });
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'auto' });
    userScrollsTo(800);
    rerender([...start, item('d')]);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('scrolls to an own item even when reading older ones', () => {
    const { rerender, userScrollsTo } = setup({ isOwn: (entry) => entry.authorId === 'me' });
    userScrollsTo(0);
    scrollTo.mockClear();
    rerender([...start, item('d')]);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender([...start, item('d'), item('e', 'me')]);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('jumps to an item and flashes it for 1.6 seconds', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    render(
      <MessageList
        items={start}
        renderItem={(entry, context) => (
          <button
            type="button"
            data-highlighted={context.highlighted}
            onClick={() => context.jumpTo('b')}
          >
            {entry.id}
          </button>
        )}
      />,
      { wrapper: MantineProvider }
    );

    fireEvent.click(screen.getByText('c'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="b"]'));
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'true');
    act(() => jest.advanceTimersByTime(1600));
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'false');
    jest.useRealTimers();
  });

  it('jumps and flashes from outside the list through controlRef', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(
      <MessageList
        items={start}
        controlRef={control}
        renderItem={(entry, context) => (
          <span data-highlighted={context.highlighted}>{entry.id}</span>
        )}
      />,
      { wrapper: MantineProvider }
    );

    act(() => control.current!.jumpTo('b'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="b"]'));
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'true');
    act(() => jest.advanceTimersByTime(1600));
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'false');
    jest.useRealTimers();
  });

  it('moves focus to the item it jumps to, without a second scroll', () => {
    const control = React.createRef<MessageListControl>();
    render(
      <MessageList
        items={start}
        controlRef={control}
        renderItem={(entry) => <span>{entry.id}</span>}
      />,
      { wrapper: MantineProvider }
    );
    const target = document.querySelector<HTMLElement>('[data-item-id="b"]')!;
    const focus = jest.spyOn(target, 'focus');
    act(() => control.current!.jumpTo('b'));
    expect(target).toHaveFocus();
    expect(target).toHaveAttribute('tabindex', '-1');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('leaves focus alone with { focus: false }, and ignores an unknown id', () => {
    const control = React.createRef<MessageListControl>();
    render(
      <>
        <input aria-label="Search" />
        <MessageList
          items={start}
          controlRef={control}
          renderItem={(entry) => <span>{entry.id}</span>}
        />
      </>,
      { wrapper: MantineProvider }
    );
    const search = screen.getByRole('textbox', { name: 'Search' });
    search.focus();
    act(() => control.current!.jumpTo('b', { focus: false }));
    expect(search).toHaveFocus();
    expect(document.querySelector('[data-item-id="b"]')).not.toHaveAttribute('tabindex');
    expect(() => act(() => control.current!.jumpTo('missing'))).not.toThrow();
    expect(search).toHaveFocus();
  });

  it('never scrolls with autoScroll={false}', () => {
    const { rerender } = setup({ autoScroll: false, isOwn: () => true });
    rerender([...start, item('d')]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('jumps without animating when the user prefers reduced motion', () => {
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }) as any
    );
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    render(
      <MessageList
        items={start}
        renderItem={(entry, context) => (
          <button type="button" onClick={() => context.jumpTo('b')}>
            {entry.id}
          </button>
        )}
      />,
      { wrapper: MantineProvider }
    );
    fireEvent.click(screen.getByText('c'));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
  });

  it('asks for older items once, even when scroll events arrive before the next render', () => {
    const onLoadOlder = jest.fn();
    const { userScrollsTo, rerender } = setup({ onLoadOlder, hasOlder: true });
    userScrollsTo(10);
    userScrollsTo(0);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    // Loading starts and ends without new items: the user may ask again
    rerender(start, { onLoadOlder, hasOlder: true, loadingOlder: true });
    rerender(start, { onLoadOlder, hasOlder: true, loadingOlder: false });
    userScrollsTo(0);
    expect(onLoadOlder).toHaveBeenCalledTimes(2);

    // Older items arrive: the next scroll to the top asks for the page before them
    rerender([item('a'), ...start], { onLoadOlder, hasOlder: true });
    userScrollsTo(0);
    expect(onLoadOlder).toHaveBeenCalledTimes(3);
  });
  it('follows the newest item while it grows at the bottom, and stops when the user scrolls up', () => {
    const { rerender, userScrollsTo, viewport } = setup();
    userScrollsTo(800);
    height = 1300;
    rerender([...start]);
    expect(viewport.scrollTop).toBe(1300);

    // Same height: nothing to follow
    rerender([...start]);
    expect(viewport.scrollTop).toBe(1300);

    userScrollsTo(300);
    height = 1600;
    rerender([...start]);
    expect(viewport.scrollTop).toBe(300);
  });

  it('does not follow growth with autoScroll off', () => {
    const { rerender, userScrollsTo, viewport } = setup({ autoScroll: false });
    userScrollsTo(800);
    height = 1300;
    rerender([...start]);
    expect(viewport.scrollTop).toBe(800);
  });
});

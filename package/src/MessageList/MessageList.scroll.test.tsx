import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { MessageBase } from '../types';
import { MessageList, MessageListProps } from './MessageList';

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
});

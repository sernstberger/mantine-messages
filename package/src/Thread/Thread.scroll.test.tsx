import { MantineProvider } from '@mantine/core';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { Thread } from './Thread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya' },
];

const message = (id: string, authorId = 'maya'): ChatMessage => ({
  id,
  authorId,
  body: id,
  createdAt: new Date(2026, 10, 15, 9),
});

const start = [message('a'), message('b')];

// jsdom has no layout: give every element a 1000px tall content in a 200px box
const scrollTo = jest.fn();
let now = 0;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 1000 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 200 });
  HTMLElement.prototype.scrollTo = scrollTo;
});

afterAll(() => {
  delete (HTMLElement.prototype as any).scrollHeight;
  delete (HTMLElement.prototype as any).clientHeight;
});

beforeEach(() => {
  scrollTo.mockClear();
  now = 10_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setup(messages = start, props: Partial<React.ComponentProps<typeof Thread>> = {}) {
  const view = render(<Thread messages={messages} users={users} currentUserId="me" {...props} />, {
    wrapper: MantineProvider,
  });
  const viewport = view.container.querySelector<HTMLDivElement>('.mantine-ScrollArea-viewport')!;

  const rerender = (next: ChatMessage[]) =>
    view.rerender(<Thread messages={next} users={users} currentUserId="me" {...props} />);

  /** The user scrolls to `top` after the pinned time of the last automatic scroll */
  const userScrollsTo = (top: number) => {
    now += 1000;
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, value: top });
    fireEvent.scroll(viewport);
  };

  return { rerender, userScrollsTo, viewport };
}

describe('Thread scrolling', () => {
  it('opens at the newest message without animating', () => {
    setup();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'auto' });
  });

  it('follows a new message smoothly while at the bottom', () => {
    const { rerender, userScrollsTo } = setup();
    userScrollsTo(800);
    rerender([...start, message('c')]);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('stays put while the user reads older messages, unless they sent the message', () => {
    const { rerender, userScrollsTo } = setup();
    userScrollsTo(100);
    scrollTo.mockClear();

    rerender([...start, message('c')]);
    expect(scrollTo).not.toHaveBeenCalled();

    rerender([...start, message('c'), message('d', 'me')]);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('ignores scroll events from its own smooth scroll', () => {
    const { rerender, viewport } = setup();
    // Halfway down an automatic scroll, before the pinned time is over
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, value: 100 });
    fireEvent.scroll(viewport);

    rerender([...start, message('c')]);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('does not scroll when older messages load at the top', () => {
    const { rerender, userScrollsTo } = setup();
    userScrollsTo(0);
    scrollTo.mockClear();

    rerender([message('older'), ...start]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('jumps to the bottom of a newly opened conversation', () => {
    const { rerender, userScrollsTo } = setup();
    userScrollsTo(0);
    rerender([message('x'), message('y')]);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'auto' });
  });

  it('does not animate when the user prefers reduced motion', () => {
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }) as any
    );
    const { rerender } = setup();
    rerender([...start, message('c')]);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'auto' });
  });

  it('never scrolls with autoScroll={false}', () => {
    const { rerender } = setup(start, { autoScroll: false });
    rerender([...start, message('c', 'me')]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does nothing for an empty thread', () => {
    setup([]);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

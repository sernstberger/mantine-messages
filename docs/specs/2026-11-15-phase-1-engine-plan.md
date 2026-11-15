# Phase 1: Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull the shared engine out of ChatThread (a generic `MessageList` with its `useMessageList` hook, `MessageActions`, `Reactions`, `Attachments`) and rebuild `ChatThread` on it, with no behaviour lost and three new abilities: loading older messages without the view jumping, a "New messages" line, and a configurable actions toolbar.

**Architecture:** `useMessageList` owns the viewport: stick-to-bottom, scroll anchoring when older items are prepended, `onLoadOlder` near the top, and jump-to with a flash. `MessageList<T extends MessageBase>` renders any item type through `renderItem(item, context)`; it adds date dividers, the unread line and a top loader, and tells each item whether it starts or ends a group. `ChatThread` becomes a `renderItem` for `ChatMessage` that groups by author and time. `groupMessages` is removed.

**Tech Stack:** React 19, Mantine 9.8 (`factory`, Styles API, `ScrollArea`, `Divider`, `Loader`, `Menu`, `ActionIcon`, `Image`, `useClipboard`, `useTimeout`, `useReducedMotion`, `useIsomorphicEffect`), TypeScript, Jest + @mantine-tests/core + Testing Library, Storybook 8.

**Spec:** `docs/specs/2026-11-15-feature-set-design.md` (phase 1 row of "Build order"). Deviation agreed in chat: `Message.Root/Avatar/Body/Meta` move to phase 2, where TeamThread is their second user.

## Global Constraints

- Peers of the root entry: `@mantine/core`, `@mantine/hooks`, `react`, `react-dom` only. No new dependencies in this phase.
- `npm test` must pass: syncpack, oxfmt format check, typecheck (package and docs), oxlint (no string concatenation: use template literals), stylelint, Jest with 100% statements, branches, functions and lines.
- Run `npm run build && npm run docgen` before `npm test` whenever exported types or components change (the docs typecheck reads `package/dist`).
- Every component uses `factory()`, `useProps`, the Styles API and `data-*` modifiers. State rules that must beat light/dark or hover backgrounds use `[data-x]`, not `:where()`.
- jsdom has no layout: tests fake `scrollHeight`, `clientHeight` and `scrollTop` with `Object.defineProperty`; any `scrollTop` they define must be `writable: true` because the code now assigns to it.
- Show output in Steve's watch tab: wrap commands as `{ printf '\n$ CMD\n'; CMD 2>&1; } | tee -a .claude/run.log`.
- Format before testing: `npx oxfmt -c oxfmt.config.mjs --write package/src docs`.
- Work on a branch: `git switch -c feat/engine` before Task 1. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `package/src/utils/dates.ts` (new) | `toDate`, `dayKey` |
| `package/src/utils/format.ts` | gains `formatBytes`; imports `toDate` from `dates.ts` |
| `package/src/icons.tsx` (new) | Small inline SVG icons used by several components |
| `package/src/MessageList/use-message-list.ts` (new) | Viewport behaviour (replaces `ChatThread/use-stick-to-bottom.ts`) |
| `package/src/MessageList/MessageList.tsx`, `.module.css` (new) | Generic list: dividers, groups, unread line, loader |
| `package/src/MessageActions/MessageActions.tsx`, `.module.css` (new) | Action buttons + overflow Menu |
| `package/src/Reactions/Reactions.tsx`, `.module.css` (new) | Emoji reaction chips |
| `package/src/Attachments/Attachments.tsx`, `.module.css` (new) | Image thumbnails and file chips |
| `package/src/ChatThread/ChatThread.tsx`, `.module.css` | Rebuilt on the above |
| `package/src/utils/group-messages.ts` + test | Deleted |

---

### Task 1: Date helpers and `formatBytes`

**Files:**
- Create: `package/src/utils/dates.ts`, `package/src/utils/dates.test.ts`
- Modify: `package/src/utils/format.ts`, `package/src/utils/format.test.ts`, `package/src/utils/group-messages.ts` (import `toDate` from `dates.ts`, delete its own copy)

**Interfaces:**
- Produces: `toDate(value: MessageDate): Date`, `dayKey(value: MessageDate): string` (local `YYYY-M-D`), `formatBytes(bytes: number, locale?: string): string`.

- [ ] **Step 1: Write failing tests**

`package/src/utils/dates.test.ts`:

```ts
import { dayKey, toDate } from './dates';

describe('dates', () => {
  it('turns Date, string and number into a Date', () => {
    const date = new Date(2026, 10, 15, 9);
    expect(toDate(date)).toBe(date);
    expect(toDate(date.getTime()).getTime()).toBe(date.getTime());
    expect(toDate(date.toISOString()).getTime()).toBe(date.getTime());
  });

  it('gives one key per local day', () => {
    expect(dayKey(new Date(2026, 10, 15, 0, 1))).toBe(dayKey(new Date(2026, 10, 15, 23, 59)));
    expect(dayKey(new Date(2026, 10, 15))).not.toBe(dayKey(new Date(2026, 10, 16)));
  });
});
```

Append to `package/src/utils/format.test.ts`:

```ts
describe('formatBytes', () => {
  it('uses B, KB and MB', () => {
    expect(formatBytes(512, 'en-US')).toBe('512 B');
    expect(formatBytes(1536, 'en-US')).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024, 'en-US')).toBe('5 MB');
  });
});
```

and add `formatBytes` to that file's import from `'./format'`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/utils`
Expected: FAIL, `Cannot find module './dates'` and `formatBytes is not a function`.

- [ ] **Step 3: Implement**

`package/src/utils/dates.ts`:

```ts
import type { MessageDate } from '../types';

export const toDate = (value: MessageDate) => (value instanceof Date ? value : new Date(value));

/** Same string for every moment of one local day */
export function dayKey(value: MessageDate) {
  const date = toDate(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
```

In `package/src/utils/format.ts` replace `import { toDate } from './group-messages';` with `import { toDate } from './dates';` and append:

```ts
/** File size, for example "512 B", "1.5 KB", "5 MB" */
export function formatBytes(bytes: number, locale?: string) {
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

  if (bytes < 1024) {
    return `${format(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${format(bytes / 1024)} KB`;
  }

  return `${format(bytes / 1024 / 1024)} MB`;
}
```

In `package/src/utils/group-messages.ts` delete the `export const toDate = ...` line and add `import { toDate } from './dates';` (the file is deleted in Task 7; this keeps it compiling until then). In `package/src/ChatThread/use-stick-to-bottom.ts` nothing changes.

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add toDate, dayKey and formatBytes helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared icons

**Files:**
- Create: `package/src/icons.tsx`, `package/src/icons.test.tsx`
- Modify: `package/src/ChatThread/ChatThread.tsx` (use `ReplyIcon` from `../icons`, delete its local copy)

**Interfaces:**
- Produces: `ReplyIcon`, `SmileIcon`, `CopyIcon`, `CheckIcon`, `EditIcon`, `ThreadIcon`, `DotsIcon`, `FileIcon`, each `(props: { size?: number }) => JSX.Element`, default size 16, `aria-hidden`.

- [ ] **Step 1: Write the failing test**

`package/src/icons.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import React from 'react';
import * as icons from './icons';

describe('icons', () => {
  it.each(Object.entries(icons))('%s is a hidden 16px svg, sizable', (_, Icon) => {
    const { container, rerender } = render(<Icon />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
    rerender(<Icon size={12} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '12');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/icons`
Expected: FAIL, `Cannot find module './icons'`.

- [ ] **Step 3: Implement `package/src/icons.tsx`**

```tsx
import React from 'react';

interface IconProps {
  size?: number;
}

function icon(paths: string[]) {
  return function Icon({ size = 16 }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
        {paths.map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  };
}

export const ReplyIcon = icon(['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11']);
export const SmileIcon = icon([
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  'M8 14s1.5 2 4 2 4-2 4-2',
  'M9 9h.01',
  'M15 9h.01',
]);
export const CopyIcon = icon(['M8 8h12v12H8z', 'M16 8V4H4v12h4']);
export const CheckIcon = icon(['M20 6 9 17l-5-5']);
export const EditIcon = icon(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']);
export const ThreadIcon = icon(['M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z']);
export const DotsIcon = icon(['M5 12h.01', 'M12 12h.01', 'M19 12h.01']);
export const FileIcon = icon(['M14 3H6v18h12V7Z', 'M14 3v4h4']);
```

In `package/src/ChatThread/ChatThread.tsx` delete the `function ReplyIcon(...) { ... }` block and add `import { ReplyIcon } from '../icons';`.

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add shared inline icons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `useMessageList` and `MessageList`

**Files:**
- Create: `package/src/MessageList/use-message-list.ts`, `package/src/MessageList/MessageList.tsx`, `package/src/MessageList/MessageList.module.css`, `package/src/MessageList/MessageList.test.tsx`, `package/src/MessageList/MessageList.scroll.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: `toDate`, `dayKey` (Task 1); `formatDay` (`utils/format.ts`); `MessageBase` (`types.ts`).
- Produces:
  - `useMessageList(options: UseMessageListOptions): { viewportRef: RefObject<HTMLDivElement | null>; onScrollPositionChange: () => void; jumpTo: (id: string) => void; highlightedId: string | null }`
  - `UseMessageListOptions { autoScroll: boolean; firstId?: string; lastId?: string; lastIsOwn: boolean; onLoadOlder?: () => void; hasOlder?: boolean; loadingOlder?: boolean }`
  - `MessageList` component, generic call signature `<T extends MessageBase>(props: MessageListProps<T>) => JSX.Element`
  - `MessageListProps<T>`: `items: T[]`, `renderItem(item: T, context: MessageListItemContext<T>): ReactNode`, `groupWith?(previous: T, item: T): boolean`, `isOwn?(item: T): boolean`, `locale?`, `withDateDividers?` (default `true`), `unreadAfterId?: string | null`, `autoScroll?` (default `true`), `onLoadOlder?`, `hasOlder?`, `loadingOlder?`, `labels?: Partial<MessageListLabels>`
  - `MessageListItemContext<T> { index: number; previous?: T; next?: T; groupStart: boolean; groupEnd: boolean; highlighted: boolean; jumpTo: (id: string) => void }`
  - `MessageListLabels { unread: string }` (default `'New messages'`)
  - `MessageListStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item'`
  - Each item is wrapped in `<div data-item-id={item.id}>` (Styles API part `item`); `jumpTo(id)` scrolls that wrapper to the centre.

- [ ] **Step 1: Write the failing render tests**

`package/src/MessageList/MessageList.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core';
import { tests } from '@mantine-tests/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { MessageBase } from '../types';
import { MessageList, MessageListBase, MessageListProps, MessageListStylesNames } from './MessageList';

interface Note extends MessageBase {
  text: string;
}

const note = (id: string, authorId: string, day: number, minute = 0): Note => ({
  id,
  authorId,
  createdAt: new Date(2026, 10, day, 9, minute),
  text: `note ${id}`,
});

const items = [note('a', 'maya', 14), note('b', 'maya', 15), note('c', 'maya', 15, 1), note('d', 'me', 15, 2)];

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
    props: { items, renderItem: (item: Note) => item.text } as MessageListProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MessageList',
    stylesApiSelectors: ['root', 'list', 'divider', 'item'],
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
        <MessageList<Note> items={items} renderItem={(item) => item.text} withDateDividers={false} />
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
```

- [ ] **Step 2: Write the failing scroll tests**

`package/src/MessageList/MessageList.scroll.test.tsx`:

```tsx
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
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: top });
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
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.querySelector('[data-item-id="b"]')
    );
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'true');
    act(() => jest.advanceTimersByTime(1600));
    expect(screen.getByText('b')).toHaveAttribute('data-highlighted', 'false');
    jest.useRealTimers();
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest package/src/MessageList`
Expected: FAIL, `Cannot find module './MessageList'`.

- [ ] **Step 4: Implement the hook**

`package/src/MessageList/use-message-list.ts`:

```ts
import { useIsomorphicEffect, useReducedMotion, useTimeout } from '@mantine/hooks';
import { useRef, useState } from 'react';

export interface UseMessageListOptions {
  /** Keep the newest item in view */
  autoScroll: boolean;

  /** `id` of the oldest item */
  firstId?: string;

  /** `id` of the newest item */
  lastId?: string;

  /** The newest item was written by the current user */
  lastIsOwn: boolean;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;
  hasOlder?: boolean;
  loadingOlder?: boolean;
}

// How close to an edge, in px, still counts as at that edge
const BOTTOM = 80;
const TOP = 120;

/**
 * Viewport behaviour of a message list. Opens at the newest item; follows new items while the
 * user is at the bottom or when they wrote them; keeps the view steady when older items are
 * prepended; asks for older items near the top; scrolls to an item and flashes it on request.
 */
export function useMessageList({
  autoScroll,
  firstId,
  lastId,
  lastIsOwn,
  onLoadOlder,
  hasOlder = false,
  loadingOlder = false,
}: UseMessageListOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  // A smooth scroll fires scroll events on its way down; they must not count as the user leaving
  const pinnedUntil = useRef(0);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const reduceMotion = useReducedMotion();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlightedId(null), 1600);

  // Runs after every render, so `previous.height` is always the height before this render
  useIsomorphicEffect(() => {
    const viewport = viewportRef.current!;
    const before = previous.current;
    previous.current = { first: firstId, last: lastId, height: viewport.scrollHeight };

    if (firstId === before.first && lastId === before.last) {
      return;
    }

    const prepended = before.first !== undefined && firstId !== before.first && lastId === before.last;

    if (prepended) {
      viewport.scrollTop += viewport.scrollHeight - before.height;
      return;
    }

    if (!autoScroll || lastId === before.last) {
      return;
    }

    const fresh = firstId !== before.first;

    if (fresh || atBottom.current || lastIsOwn) {
      atBottom.current = true;
      pinnedUntil.current = Date.now() + 600;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: fresh || reduceMotion ? 'auto' : 'smooth',
      });
    }
  });

  const onScrollPositionChange = () => {
    const viewport = viewportRef.current!;

    if (Date.now() >= pinnedUntil.current) {
      atBottom.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM;
    }

    if (onLoadOlder && hasOlder && !loadingOlder && viewport.scrollTop <= TOP) {
      onLoadOlder();
    }
  };

  const jumpTo = (id: string) => {
    Array.from(viewportRef.current!.querySelectorAll<HTMLElement>('[data-item-id]'))
      .find((element) => element.dataset.itemId === id)
      ?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    flash.clear();
    setHighlightedId(id);
    flash.start();
  };

  return { viewportRef, onScrollPositionChange, jumpTo, highlightedId };
}
```

- [ ] **Step 5: Implement the component**

`package/src/MessageList/MessageList.tsx`:

```tsx
import {
  Box,
  BoxProps,
  Center,
  Divider,
  ElementProps,
  factory,
  Factory,
  Loader,
  ScrollArea,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import type { MessageBase } from '../types';
import { dayKey } from '../utils/dates';
import { formatDay } from '../utils/format';
import classes from './MessageList.module.css';
import { useMessageList } from './use-message-list';

export type MessageListStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item';

export interface MessageListLabels {
  /** Line above the first unread item */
  unread: string;
}

export interface MessageListItemContext<T extends MessageBase> {
  index: number;
  previous?: T;
  next?: T;

  /** First item of a group: the first item, after a date divider, or when `groupWith` says no */
  groupStart: boolean;

  /** Last item of a group */
  groupEnd: boolean;

  /** True for 1.6 seconds after `jumpTo` this item */
  highlighted: boolean;

  /** Scrolls to the item with this `id` and flashes it */
  jumpTo: (id: string) => void;
}

export interface MessageListProps<T extends MessageBase = MessageBase>
  extends BoxProps, StylesApiProps<MessageListFactory>, ElementProps<'div'> {
  /** Items, oldest first */
  items: T[];

  /** Renders one item */
  renderItem: (item: T, context: MessageListItemContext<T>) => React.ReactNode;

  /** Whether `item` continues the group of `previous`; without it every item is its own group */
  groupWith?: (previous: T, item: T) => boolean;

  /** Whether the current user wrote the item; the list always scrolls to their new items */
  isOwn?: (item: T) => boolean;

  /** Locale for date dividers, the browser's by default */
  locale?: string;

  /** Divider with the date before each new day, `true` by default */
  withDateDividers?: boolean;

  /** `id` of the last read item; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Keep the newest item in view, `true` by default */
  autoScroll?: boolean;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More items exist before the first one */
  hasOlder?: boolean;

  /** Older items are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text, for translation */
  labels?: Partial<MessageListLabels>;
}

export type MessageListFactory = Factory<{
  props: MessageListProps<any>;
  ref: HTMLDivElement;
  stylesNames: MessageListStylesNames;
}>;

const defaultProps: Partial<MessageListProps> = {
  withDateDividers: true,
  autoScroll: true,
};

const defaultLabels: MessageListLabels = { unread: 'New messages' };

export const MessageListBase = factory<MessageListFactory>((_props) => {
  const props = useProps('MessageList', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    items,
    renderItem,
    groupWith,
    isOwn,
    locale,
    withDateDividers,
    unreadAfterId,
    autoScroll,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    role = 'log',
    'aria-live': ariaLive = 'polite',
    ...others
  } = props;

  const getStyles = useStyles<MessageListFactory>({
    name: 'MessageList',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const last = items[items.length - 1];
  const { viewportRef, onScrollPositionChange, jumpTo, highlightedId } = useMessageList({
    autoScroll: !!autoScroll,
    firstId: items[0]?.id,
    lastId: last?.id,
    lastIsOwn: !!last && !!isOwn?.(last),
    onLoadOlder,
    hasOlder,
    loadingOlder,
  });
  const allLabels = { ...defaultLabels, ...labels };

  const newDay = (a: MessageBase | undefined, b: MessageBase) =>
    !!withDateDividers && (!a || dayKey(a.createdAt) !== dayKey(b.createdAt));

  return (
    <ScrollArea
      ref={ref}
      viewportRef={viewportRef}
      onScrollPositionChange={onScrollPositionChange}
      {...getStyles('root')}
      {...others}
    >
      <Box role={role} aria-live={ariaLive} {...getStyles('list')}>
        {loadingOlder && (
          <Center {...getStyles('loader')}>
            <Loader size="sm" />
          </Center>
        )}
        {items.map((item, index) => {
          const previous = items[index - 1];
          const next = items[index + 1];
          const dayStarts = newDay(previous, item);
          const groupStart = !previous || dayStarts || !groupWith?.(previous, item);
          const groupEnd = !next || newDay(item, next) || !groupWith?.(item, next);

          return (
            <React.Fragment key={item.id}>
              {dayStarts && (
                <Divider
                  label={formatDay(item.createdAt, locale)}
                  labelPosition="center"
                  {...getStyles('divider')}
                />
              )}
              <Box data-item-id={item.id} {...getStyles('item')}>
                {renderItem(item, {
                  index,
                  previous,
                  next,
                  groupStart,
                  groupEnd,
                  highlighted: highlightedId === item.id,
                  jumpTo,
                })}
              </Box>
              {item.id === unreadAfterId && next && (
                <Divider
                  label={allLabels.unread}
                  labelPosition="center"
                  color="red"
                  {...getStyles('unread')}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
    </ScrollArea>
  );
});

MessageListBase.displayName = 'MessageList';
MessageListBase.classes = classes;

/** `MessageListBase` with a generic signature, so `renderItem` gets the item type */
export const MessageList = MessageListBase as unknown as (<T extends MessageBase>(
  props: MessageListProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.JSX.Element) &
  Omit<typeof MessageListBase, never>;
```

`package/src/MessageList/MessageList.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  padding: var(--mantine-spacing-md);
}

.divider {
  margin-block: var(--mantine-spacing-sm);
  font-weight: 500;
}

.unread {
  margin-block: var(--mantine-spacing-xs);
  font-weight: 600;
}

.loader {
  padding-block: var(--mantine-spacing-sm);
}

.item {
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 6: Export**

In `package/src/index.ts` add:

```ts
export { MessageList, MessageListBase } from './MessageList/MessageList';
export type {
  MessageListProps,
  MessageListFactory,
  MessageListStylesNames,
  MessageListItemContext,
  MessageListLabels,
} from './MessageList/MessageList';
export { useMessageList } from './MessageList/use-message-list';
export type { UseMessageListOptions } from './MessageList/use-message-list';
```

In `package/src/index.test.ts` add `'MessageList'`, `'MessageListBase'` and `'useMessageList'` to the expected key list, keeping it in `sort()` order (uppercase before lowercase): `ChatThread, Composer, Inbox, MessageList, MessageListBase, getPreview, groupMessages, stripMarkdown, truncate, useMessageList`.

- [ ] **Step 7: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%. If `tsc` rejects the `MessageList` cast or `<MessageList<Note>>` in the test, stop and report the error; do not loosen types to `any` in the public signature.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add MessageList and useMessageList: generic items, groups, dividers, unread line, load older

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `MessageActions`

**Files:**
- Create: `package/src/MessageActions/MessageActions.tsx`, `.module.css`, `.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: icons (Task 2), `truncate` (`utils/preview.ts`).
- Produces:
  - `MessageActionName = 'reply' | 'react' | 'thread' | 'edit' | 'copy'`
  - `MessageActionItem { id: string; label: string; icon: React.ReactNode; onClick: () => void; color?: MantineColor }`
  - `MessageAction = MessageActionName | MessageActionItem`
  - `MessageActionsProps`: `actions: MessageAction[]`, `text: string` (plain text of the message, for labels and copy), `onReply?`, `onReact?`, `onThread?`, `onEdit?` (each `() => void`), `maxVisible?` (default 3), `labels?: Partial<MessageActionsLabels>`
  - `MessageActionsLabels { reply; react; thread; edit; copy; copied; more }` (defaults `'Reply'`, `'React'`, `'Reply in thread'`, `'Edit'`, `'Copy'`, `'Copied'`, `'More actions'`)
  - A built-in action shows only when its handler is set; `copy` needs none. Button labels are `` `${label}: ${truncate(text, 80)}` ``. Renders nothing when no action resolves.
  - `MessageActionsStylesNames = 'root' | 'action'`; root gets `data-menu-open` while the overflow menu is open.

- [ ] **Step 1: Write the failing tests**

`package/src/MessageActions/MessageActions.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MessageActions, MessageActionsProps, MessageActionsStylesNames } from './MessageActions';

const defaultProps: MessageActionsProps = { actions: ['reply'], text: 'Hi', onReply: () => {} };

describe('MessageActions', () => {
  tests.itSupportsSystemProps<MessageActionsProps, MessageActionsStylesNames>({
    component: MessageActions,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MessageActions',
    stylesApiSelectors: ['root', 'action'],
  });

  it('shows built-ins only with a handler, labelled with the message', async () => {
    const onReply = jest.fn();
    render(<MessageActions actions={['reply', 'react', 'edit']} text="See you" onReply={onReply} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Reply: See you' }));
    expect(onReply).toHaveBeenCalled();
  });

  it('renders nothing when no action applies', () => {
    const { container } = render(<MessageActions actions={['react']} text="x" />);
    expect(container.querySelector('.mantine-MessageActions-root')).not.toBeInTheDocument();
  });

  it('copies the text and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MessageActions actions={['copy']} text="Copy me" labels={{ copied: 'Done' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Copy me' }));
    expect(writeText).toHaveBeenCalledWith('Copy me');
    expect(await screen.findByRole('button', { name: 'Done: Copy me' })).toBeInTheDocument();
  });

  it('puts actions past maxVisible in a More menu, with custom items', async () => {
    const onArchive = jest.fn();
    const onThread = jest.fn();
    const onEdit = jest.fn();
    const { container } = render(
      <MessageActions
        maxVisible={2}
        text="Hi"
        onReact={() => {}}
        onThread={onThread}
        onEdit={onEdit}
        actions={[
          'react',
          'thread',
          'edit',
          { id: 'archive', label: 'Archive', icon: <span />, onClick: onArchive, color: 'red' },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: 'React: Hi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply in thread: Hi' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(container.querySelector('[data-menu-open]')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    expect(onArchive).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reply in thread' }));
    expect(onThread).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/MessageActions`
Expected: FAIL, `Cannot find module './MessageActions'`.

- [ ] **Step 3: Implement**

`package/src/MessageActions/MessageActions.tsx`:

```tsx
import {
  ActionIcon,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  Menu,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import React, { useState } from 'react';
import { CheckIcon, CopyIcon, DotsIcon, EditIcon, ReplyIcon, SmileIcon, ThreadIcon } from '../icons';
import { truncate } from '../utils/preview';
import classes from './MessageActions.module.css';

export type MessageActionName = 'reply' | 'react' | 'thread' | 'edit' | 'copy';

export interface MessageActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: MantineColor;
}

export type MessageAction = MessageActionName | MessageActionItem;

export interface MessageActionsLabels {
  reply: string;
  react: string;
  thread: string;
  edit: string;
  copy: string;
  copied: string;

  /** The button that opens the overflow menu */
  more: string;
}

export type MessageActionsStylesNames = 'root' | 'action';

export interface MessageActionsProps
  extends BoxProps, StylesApiProps<MessageActionsFactory>, ElementProps<'div'> {
  /** Built-in names and custom items, in order */
  actions: MessageAction[];

  /** Plain text of the message, for button labels and the copy action */
  text: string;
  onReply?: () => void;
  onReact?: () => void;
  onThread?: () => void;
  onEdit?: () => void;

  /** Buttons shown before the rest go in a menu, 3 by default */
  maxVisible?: number;

  /** Text, for translation */
  labels?: Partial<MessageActionsLabels>;
}

export type MessageActionsFactory = Factory<{
  props: MessageActionsProps;
  ref: HTMLDivElement;
  stylesNames: MessageActionsStylesNames;
}>;

const defaultLabels: MessageActionsLabels = {
  reply: 'Reply',
  react: 'React',
  thread: 'Reply in thread',
  edit: 'Edit',
  copy: 'Copy',
  copied: 'Copied',
  more: 'More actions',
};

const defaultProps: Partial<MessageActionsProps> = { maxVisible: 3 };

export const MessageActions = factory<MessageActionsFactory>((_props) => {
  const props = useProps('MessageActions', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    actions,
    text,
    onReply,
    onReact,
    onThread,
    onEdit,
    maxVisible,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<MessageActionsFactory>({
    name: 'MessageActions',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const allLabels = { ...defaultLabels, ...labels };
  const clipboard = useClipboard({ timeout: 1500 });
  const [menuOpen, setMenuOpen] = useState(false);

  const builtIns: Record<MessageActionName, MessageActionItem | null> = {
    reply: onReply ? { id: 'reply', label: allLabels.reply, icon: <ReplyIcon />, onClick: onReply } : null,
    react: onReact ? { id: 'react', label: allLabels.react, icon: <SmileIcon />, onClick: onReact } : null,
    thread: onThread
      ? { id: 'thread', label: allLabels.thread, icon: <ThreadIcon />, onClick: onThread }
      : null,
    edit: onEdit ? { id: 'edit', label: allLabels.edit, icon: <EditIcon />, onClick: onEdit } : null,
    copy: clipboard.copied
      ? { id: 'copy', label: allLabels.copied, icon: <CheckIcon />, onClick: () => clipboard.copy(text) }
      : { id: 'copy', label: allLabels.copy, icon: <CopyIcon />, onClick: () => clipboard.copy(text) },
  };

  const resolved = actions
    .map((action) => (typeof action === 'string' ? builtIns[action] : action))
    .filter((action): action is MessageActionItem => action !== null);

  if (resolved.length === 0) {
    return null;
  }

  const overflow = resolved.length > maxVisible!;
  const visible = overflow ? resolved.slice(0, maxVisible! - 1) : resolved;
  const rest = overflow ? resolved.slice(maxVisible! - 1) : [];
  const short = truncate(text, 80);

  return (
    <Box ref={ref} mod={{ 'menu-open': menuOpen }} {...getStyles('root')} {...others}>
      {visible.map((action) => (
        <ActionIcon
          key={action.id}
          variant="subtle"
          color={action.color ?? 'gray'}
          size="sm"
          radius="xl"
          aria-label={`${action.label}: ${short}`}
          onClick={action.onClick}
          {...getStyles('action')}
        >
          {action.icon}
        </ActionIcon>
      ))}
      {overflow && (
        <Menu position="bottom-end" onChange={setMenuOpen}>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              aria-label={allLabels.more}
              {...getStyles('action')}
            >
              <DotsIcon />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {rest.map((action) => (
              <Menu.Item
                key={action.id}
                leftSection={action.icon}
                color={action.color}
                onClick={action.onClick}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Box>
  );
});

MessageActions.displayName = 'MessageActions';
MessageActions.classes = classes;
```

`package/src/MessageActions/MessageActions.module.css`:

```css
.root {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Export, run tests**

In `package/src/index.ts`:

```ts
export { MessageActions } from './MessageActions/MessageActions';
export type {
  MessageActionsProps,
  MessageActionsFactory,
  MessageActionsStylesNames,
  MessageActionsLabels,
  MessageAction,
  MessageActionItem,
  MessageActionName,
} from './MessageActions/MessageActions';
```

Add `'MessageActions'` to the sorted list in `package/src/index.test.ts` (after `'Inbox'`).

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add MessageActions: built-in and custom actions with an overflow menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `Reactions` and `Attachments`

**Files:**
- Create: `package/src/Reactions/Reactions.tsx`, `.module.css`, `.test.tsx`; `package/src/Attachments/Attachments.tsx`, `.module.css`, `.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: `MessageReaction`, `MessageAttachment` (`types.ts`); `FileIcon` (Task 2); `formatBytes` (Task 1).
- Produces:
  - `Reactions` props: `reactions: MessageReaction[]`, `currentUserId: string`, `onToggle?: (emoji: string) => void`, `labels?: Partial<ReactionsLabels>`; `ReactionsLabels { reaction: (details: { emoji: string; count: number; mine: boolean }) => string }`, default `` `${emoji} ${count}${mine ? ', including you' : ''}` ``; stylesNames `'root' | 'reaction'`; a chip is a button (`aria-pressed`) only with `onToggle`; `data-active` when the user reacted; reactions with no users are skipped; renders nothing when none are left.
  - `Attachments` props: `attachments: MessageAttachment[]`, `onOpen?: (attachment: MessageAttachment) => void`, `locale?: string`; stylesNames `'root' | 'image' | 'file'`; images (`mimeType` starting `image/`) show a thumbnail, others a chip with name and size; with `onOpen` each is a button, without it a link to `url` opening in a new tab.

- [ ] **Step 1: Write the failing tests**

`package/src/Reactions/Reactions.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Reactions, ReactionsProps, ReactionsStylesNames } from './Reactions';

const reactions = [
  { emoji: '👍', userIds: ['me', 'maya'] },
  { emoji: '🎉', userIds: ['maya'] },
  { emoji: '😂', userIds: [] },
];
const defaultProps: ReactionsProps = { reactions, currentUserId: 'me' };

describe('Reactions', () => {
  tests.itSupportsSystemProps<ReactionsProps, ReactionsStylesNames>({
    component: Reactions,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Reactions',
    stylesApiSelectors: ['root', 'reaction'],
  });

  it('shows counts, marks your own and skips empty ones', () => {
    render(<Reactions {...defaultProps} />);
    expect(screen.getByLabelText('👍 2, including you')).toHaveAttribute('data-active');
    expect(screen.getByLabelText('🎉 1')).not.toHaveAttribute('data-active');
    expect(screen.queryByText('😂')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('toggles with onToggle, as pressed buttons, with custom labels', async () => {
    const onToggle = jest.fn();
    render(
      <Reactions
        {...defaultProps}
        onToggle={onToggle}
        labels={{ reaction: ({ emoji, count }) => `${emoji}=${count}` }}
      />
    );
    expect(screen.getByRole('button', { name: '👍=2' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '🎉=1' }));
    expect(onToggle).toHaveBeenCalledWith('🎉');
  });

  it('renders nothing without reactions', () => {
    const { container } = render(<Reactions reactions={[{ emoji: '😂', userIds: [] }]} currentUserId="me" />);
    expect(container.querySelector('.mantine-Reactions-root')).not.toBeInTheDocument();
  });
});
```

`package/src/Attachments/Attachments.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Attachments, AttachmentsProps, AttachmentsStylesNames } from './Attachments';

const attachments = [
  { id: '1', name: 'menu.png', url: '/menu.png', mimeType: 'image/png' },
  { id: '2', name: 'invoice.pdf', url: '/invoice.pdf', mimeType: 'application/pdf', size: 2048 },
  { id: '3', name: 'notes', url: '/notes' },
];
const defaultProps: AttachmentsProps = { attachments };

describe('Attachments', () => {
  tests.itSupportsSystemProps<AttachmentsProps, AttachmentsStylesNames>({
    component: Attachments,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Attachments',
    stylesApiSelectors: ['root', 'image', 'file'],
  });

  it('links to each file in a new tab without onOpen', () => {
    render(<Attachments {...defaultProps} locale="en-US" />);
    expect(screen.getByRole('img', { name: 'menu.png' })).toBeInTheDocument();
    const pdf = screen.getByRole('link', { name: /invoice\.pdf/ });
    expect(pdf).toHaveAttribute('href', '/invoice.pdf');
    expect(pdf).toHaveAttribute('target', '_blank');
    expect(pdf).toHaveTextContent('2 KB');
    expect(screen.getByRole('link', { name: 'notes' })).toBeInTheDocument();
  });

  it('calls onOpen instead when given', async () => {
    const onOpen = jest.fn();
    render(<Attachments {...defaultProps} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'menu.png' }));
    await userEvent.click(screen.getByRole('button', { name: /invoice\.pdf/ }));
    expect(onOpen.mock.calls.map(([attachment]) => attachment.id)).toEqual(['1', '2']);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/Reactions package/src/Attachments`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `Reactions`**

`package/src/Reactions/Reactions.tsx`:

```tsx
import {
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import type { MessageReaction } from '../types';
import classes from './Reactions.module.css';

export type ReactionsStylesNames = 'root' | 'reaction';

export interface ReactionsLabels {
  /** Accessible label of one reaction */
  reaction: (details: { emoji: string; count: number; mine: boolean }) => string;
}

export interface ReactionsProps
  extends BoxProps, StylesApiProps<ReactionsFactory>, ElementProps<'div'> {
  reactions: MessageReaction[];

  /** `id` of the person looking; their reactions are marked */
  currentUserId: string;

  /** Called with the emoji the user clicks; makes each reaction a toggle button */
  onToggle?: (emoji: string) => void;

  /** Text, for translation */
  labels?: Partial<ReactionsLabels>;
}

export type ReactionsFactory = Factory<{
  props: ReactionsProps;
  ref: HTMLDivElement;
  stylesNames: ReactionsStylesNames;
}>;

const defaultLabels: ReactionsLabels = {
  reaction: ({ emoji, count, mine }) => `${emoji} ${count}${mine ? ', including you' : ''}`,
};

export const Reactions = factory<ReactionsFactory>((_props) => {
  const props = useProps('Reactions', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    reactions,
    currentUserId,
    onToggle,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<ReactionsFactory>({
    name: 'Reactions',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const allLabels = { ...defaultLabels, ...labels };
  const shown = reactions.filter((reaction) => reaction.userIds.length > 0);

  if (shown.length === 0) {
    return null;
  }

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {shown.map(({ emoji, userIds }) => {
        const mine = userIds.includes(currentUserId);
        const label = allLabels.reaction({ emoji, count: userIds.length, mine });
        const content = (
          <>
            <span aria-hidden="true">{emoji}</span>
            <span aria-hidden="true">{userIds.length}</span>
          </>
        );

        return onToggle ? (
          <UnstyledButton
            key={emoji}
            aria-label={label}
            aria-pressed={mine}
            mod={{ active: mine }}
            onClick={() => onToggle(emoji)}
            {...getStyles('reaction')}
          >
            {content}
          </UnstyledButton>
        ) : (
          <Box key={emoji} aria-label={label} role="img" mod={{ active: mine }} {...getStyles('reaction')}>
            {content}
          </Box>
        );
      })}
    </Box>
  );
});

Reactions.displayName = 'Reactions';
Reactions.classes = classes;
```

`package/src/Reactions/Reactions.module.css`:

```css
.root {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-xl);
  font-size: var(--mantine-font-size-xs);
  background-color: var(--mantine-color-body);

  &[data-active] {
    border-color: var(--mantine-primary-color-filled);
    background-color: var(--mantine-primary-color-light);
  }
}
```

- [ ] **Step 4: Implement `Attachments`**

`package/src/Attachments/Attachments.tsx`:

```tsx
import {
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  Image,
  StylesApiProps,
  Text,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import { FileIcon } from '../icons';
import type { MessageAttachment } from '../types';
import { formatBytes } from '../utils/format';
import classes from './Attachments.module.css';

export type AttachmentsStylesNames = 'root' | 'image' | 'file';

export interface AttachmentsProps
  extends BoxProps, StylesApiProps<AttachmentsFactory>, ElementProps<'div'> {
  attachments: MessageAttachment[];

  /** Called when the user opens a file; without it each file is a link to its `url` */
  onOpen?: (attachment: MessageAttachment) => void;

  /** Locale for file sizes, the browser's by default */
  locale?: string;
}

export type AttachmentsFactory = Factory<{
  props: AttachmentsProps;
  ref: HTMLDivElement;
  stylesNames: AttachmentsStylesNames;
}>;

export const Attachments = factory<AttachmentsFactory>((_props) => {
  const props = useProps('Attachments', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    attachments,
    onOpen,
    locale,
    ...others
  } = props;

  const getStyles = useStyles<AttachmentsFactory>({
    name: 'Attachments',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {attachments.map((attachment) => {
        const part = attachment.mimeType?.startsWith('image/') ? 'image' : 'file';
        const content =
          part === 'image' ? (
            <Image src={attachment.url} alt={attachment.name} radius="md" />
          ) : (
            <>
              <FileIcon />
              <Text component="span" size="sm" truncate>
                {attachment.name}
              </Text>
              {attachment.size !== undefined && (
                <Text component="span" size="xs" c="dimmed">
                  {formatBytes(attachment.size, locale)}
                </Text>
              )}
            </>
          );

        // With onOpen a button, else a link that opens the file in a new tab
        return onOpen ? (
          <UnstyledButton key={attachment.id} onClick={() => onOpen(attachment)} {...getStyles(part)}>
            {content}
          </UnstyledButton>
        ) : (
          <UnstyledButton
            key={attachment.id}
            component="a"
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            {...getStyles(part)}
          >
            {content}
          </UnstyledButton>
        );
      })}
    </Box>
  );
});

Attachments.displayName = 'Attachments';
Attachments.classes = classes;
```

`package/src/Attachments/Attachments.module.css`:

```css
.root {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mantine-spacing-xs);
  margin-top: 4px;
}

.image {
  display: block;
  max-width: 240px;
  border-radius: var(--mantine-radius-md);
  overflow: hidden;
}

.file {
  display: inline-flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  max-width: 280px;
  padding: 6px 10px;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-md);
  color: var(--mantine-color-text);
  background-color: var(--mantine-color-body);
}
```

- [ ] **Step 5: Export, run tests**

In `package/src/index.ts`:

```ts
export { Reactions } from './Reactions/Reactions';
export type {
  ReactionsProps,
  ReactionsFactory,
  ReactionsStylesNames,
  ReactionsLabels,
} from './Reactions/Reactions';
export { Attachments } from './Attachments/Attachments';
export type {
  AttachmentsProps,
  AttachmentsFactory,
  AttachmentsStylesNames,
} from './Attachments/Attachments';
```

Add `'Attachments'` (first, before `'ChatThread'`) and `'Reactions'` (after `'MessageListBase'`) to the sorted list in `package/src/index.test.ts`.

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Reactions and Attachments (display)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Rebuild `ChatThread` on `MessageList`

The behaviour tests in `ChatThread.test.tsx`, `ChatThread.replies.test.tsx` and `ChatThread.scroll.test.tsx` are the parity check: they must pass with only the edits listed in Step 1.

**Files:**
- Modify: `package/src/ChatThread/ChatThread.tsx`, `ChatThread.module.css`, `ChatThread.test.tsx`, `ChatThread.replies.test.tsx`, `ChatThread.scroll.test.tsx`
- Delete: `package/src/ChatThread/use-stick-to-bottom.ts`, `package/src/utils/group-messages.ts`, `package/src/utils/group-messages.test.ts`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: `MessageList`, `MessageListItemContext` (Task 3); `MessageActions`, `MessageAction` (Task 4); `Reactions`, `Attachments` (Task 5); `ReplyIcon` (Task 2).
- Produces (changes to `ChatThreadProps`):
  - New: `actions?: MessageAction[]` (default `['reply', 'react', 'edit']`), `onReact?(message)`, `onEdit?(message)`, `onToggleReaction?(message, emoji)`, `onOpenAttachment?(message, attachment)`, `unreadAfterId?`, `onLoadOlder?`, `hasOlder?`, `loadingOlder?`
  - `ChatThreadLabels` gains `newMessages: string` (default `'New messages'`)
  - `ChatThreadStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item' | 'row' | 'avatar' | 'avatarSpace' | 'content' | 'author' | 'quoteLabel' | 'quote' | 'line' | 'bubble' | 'actions' | 'reactions' | 'attachments' | 'meta' | 'status'` (`group`, `messages` and `replyButton` are gone)
  - Removed exports: `groupMessages`, `ThreadItem`, `MessageGroup`, `DateDivider`

- [ ] **Step 1: Update the tests to the new structure (they fail until Step 3)**

In `ChatThread.test.tsx` replace the `stylesApiSelectors` array with:

```ts
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
```

In `ChatThread.replies.test.tsx`, in the test `'scrolls to the original on a click and flashes it'`, replace

```ts
    expect(scrollIntoView.mock.contexts[0]).toBe(bubble('a'));
```

with

```ts
    expect(scrollIntoView.mock.contexts[0]).toBe(bubble('a').closest('[data-item-id]'));
```

and change that test's first line to `jest.useFakeTimers({ doNotFake: ['Date'] });`.

In `ChatThread.scroll.test.tsx`, in `userScrollsTo`, make the defined `scrollTop` writable:

```ts
    Object.defineProperty(viewport, 'scrollTop', { configurable: true, writable: true, value: top });
```

Append to `ChatThread.replies.test.tsx` inside its `describe`:

```tsx
  it('shows reactions, attachments and actions from the new props', async () => {
    const onReact = jest.fn();
    const onToggleReaction = jest.fn();
    const onOpenAttachment = jest.fn();
    const rich: ChatMessage[] = [
      {
        ...messages[0],
        reactions: [{ emoji: '👍', userIds: ['me'] }],
        attachments: [{ id: 'f', name: 'menu.pdf', url: '/menu.pdf' }],
      },
    ];
    render(
      <ChatThread
        messages={rich}
        users={users}
        currentUserId="me"
        onReact={onReact}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
        unreadAfterId={null}
      />,
      { wrapper: MantineProvider }
    );
    fireEvent.click(screen.getByRole('button', { name: /^React: / }));
    fireEvent.click(screen.getByRole('button', { name: '👍 1, including you' }));
    fireEvent.click(screen.getByRole('button', { name: 'menu.pdf' }));
    expect(onReact).toHaveBeenCalledWith(rich[0]);
    expect(onToggleReaction).toHaveBeenCalledWith(rich[0], '👍');
    expect(onOpenAttachment).toHaveBeenCalledWith(rich[0], rich[0].attachments![0]);
  });

  it('passes edit, the unread line and loading through', () => {
    const onEdit = jest.fn();
    render(
      <ChatThread
        messages={messages}
        users={users}
        currentUserId="me"
        onEdit={onEdit}
        unreadAfterId="a"
        loadingOlder
        hasOlder
        labels={{ newMessages: 'Unread below' }}
      />,
      { wrapper: MantineProvider }
    );
    expect(screen.getByText('Unread below')).toBeInTheDocument();
    expect(document.querySelector('.mantine-ChatThread-loader')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit: On it' }));
    expect(onEdit).toHaveBeenCalledWith(messages[1]);
  });
```

Run: `npx jest package/src/ChatThread`
Expected: FAIL (new selectors and props missing).

- [ ] **Step 2: Replace `package/src/ChatThread/ChatThread.tsx`**

```tsx
import {
  Avatar,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Text,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React, { useMemo } from 'react';
import { Attachments } from '../Attachments/Attachments';
import { ReplyIcon } from '../icons';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList } from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type { ChatMessage, MessageAttachment, MessageStatus, MessagesUser } from '../types';
import { toDate } from '../utils/dates';
import { formatTime } from '../utils/format';
import { getPreview } from '../utils/preview';
import classes from './ChatThread.module.css';

export type ChatThreadStylesNames =
  | 'root'
  | 'list'
  | 'divider'
  | 'unread'
  | 'loader'
  | 'item'
  | 'row'
  | 'avatar'
  | 'avatarSpace'
  | 'content'
  | 'author'
  | 'quoteLabel'
  | 'quote'
  | 'line'
  | 'bubble'
  | 'actions'
  | 'reactions'
  | 'attachments'
  | 'meta'
  | 'status';

export interface ChatThreadLabels extends Record<MessageStatus, string> {
  /** Accessible label of the reply button */
  reply: string;

  /** Quote of a message that is not in `messages`, for example not loaded yet */
  unavailable: string;

  /** Caption above a quoted message; `own` and `toOwn` say which side is the current user */
  repliedTo: (names: { author: string; original: string; own: boolean; toOwn: boolean }) => string;

  /** Line above the first unread message */
  newMessages: string;
}

export interface ChatThreadProps
  extends BoxProps, StylesApiProps<ChatThreadFactory>, ElementProps<'div'> {
  /** Messages, oldest first */
  messages: ChatMessage[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking at the thread; their messages sit on the right */
  currentUserId: string;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Longest gap, in milliseconds, between two messages of one group, 5 minutes by default */
  groupWindow?: number;

  /** Show avatars and names of other people, `true` by default */
  withAuthors?: boolean;

  /**
   * Keep the newest message in view: open at the bottom, follow new messages while the user is at
   * the bottom or when they sent them, `true` by default
   */
  autoScroll?: boolean;

  /** Actions beside each message; a built-in shows only when its handler is set, `['reply', 'react', 'edit']` by default */
  actions?: MessageAction[];

  /** Called when the user asks to reply to a message */
  onReply?: (message: ChatMessage) => void;

  /** Called when the user asks to react to a message, for example to open an emoji picker */
  onReact?: (message: ChatMessage) => void;

  /** Called when the user asks to edit a message */
  onEdit?: (message: ChatMessage) => void;

  /** Called when the user clicks a reaction; makes reactions toggle buttons */
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;

  /** Called when the user opens an attachment; without it attachments are links */
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the last read message; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More messages exist before the first one */
  hasOlder?: boolean;

  /** Older messages are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text for statuses and buttons, for translation */
  labels?: Partial<ChatThreadLabels>;
}

export type ChatThreadFactory = Factory<{
  props: ChatThreadProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadStylesNames;
}>;

const defaultLabels: ChatThreadLabels = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
  reply: 'Reply',
  unavailable: 'Original message not available',
  repliedTo: ({ author, original, own, toOwn }) =>
    `${own ? 'You' : author} replied to ${toOwn ? (own ? 'yourself' : 'you') : original}`,
  newMessages: 'New messages',
};

const defaultProps: Partial<ChatThreadProps> = {
  groupWindow: 5 * 60 * 1000,
  withAuthors: true,
  autoScroll: true,
  actions: ['reply', 'react', 'edit'],
};

// Parts of the inner MessageList that ChatThread's Styles API also styles
const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

export const ChatThread = factory<ChatThreadFactory>((_props) => {
  const props = useProps('ChatThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    messages,
    users,
    currentUserId,
    locale,
    groupWindow,
    withAuthors,
    autoScroll,
    actions,
    onReply,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    unreadAfterId,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<ChatThreadFactory>({
    name: 'ChatThread',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages]
  );
  const allLabels = { ...defaultLabels, ...labels };
  const lastOwn = [...messages].reverse().find((message) => message.authorId === currentUserId);
  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;

  const sameGroup = (previous: ChatMessage, message: ChatMessage) =>
    previous.authorId === message.authorId &&
    toDate(message.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow!;

  // The answered message: a caption, then a faded copy tucked under the reply's bubble
  const renderQuote = (message: ChatMessage, jumpTo: (id: string) => void) => {
    const original = messagesById.get(message.replyToId!);

    if (!original) {
      return (
        <Box mod={{ unavailable: true }} {...getStyles('quote')}>
          <Text size="xs" lineClamp={2}>
            {allLabels.unavailable}
          </Text>
        </Box>
      );
    }

    return (
      <>
        <Text size="xs" c="dimmed" {...getStyles('quoteLabel')}>
          <ReplyIcon size={12} />
          {allLabels.repliedTo({
            author: nameOf(message.authorId),
            original: nameOf(original.authorId),
            own: message.authorId === currentUserId,
            toOwn: original.authorId === currentUserId,
          })}
        </Text>
        <UnstyledButton onClick={() => jumpTo(original.id)} {...getStyles('quote')}>
          <Text size="xs" lineClamp={2}>
            {getPreview(original)}
          </Text>
        </UnstyledButton>
      </>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <MessageList<ChatMessage>
      ref={ref}
      items={messages}
      groupWith={sameGroup}
      isOwn={(message) => message.authorId === currentUserId}
      locale={locale}
      autoScroll={autoScroll}
      unreadAfterId={unreadAfterId}
      onLoadOlder={onLoadOlder}
      hasOlder={hasOlder}
      loadingOlder={loadingOlder}
      labels={{ unread: allLabels.newMessages }}
      unstyled={unstyled}
      classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
      styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
      {...getStyles('root')}
      {...others}
      renderItem={(message, { groupStart, groupEnd, highlighted, jumpTo }) => {
        const own = message.authorId === currentUserId;
        const author = usersById.get(message.authorId);
        const name = nameOf(message.authorId);
        const showAuthor = !own && withAuthors;

        return (
          <Box mod={{ own, 'group-start': groupStart }} {...getStyles('row')}>
            {showAuthor &&
              (groupEnd ? (
                <Avatar src={author?.avatar} name={name} size="sm" {...getStyles('avatar')} />
              ) : (
                <Box {...getStyles('avatarSpace')} />
              ))}
            <Box mod={{ own }} {...getStyles('content')}>
              {showAuthor && groupStart && (
                <Text size="xs" c="dimmed" {...getStyles('author')}>
                  {name}
                </Text>
              )}
              {message.replyToId && renderQuote(message, jumpTo)}
              <Box mod={{ own }} {...getStyles('line')}>
                <Box
                  mod={{ own, status: message.status, 'message-id': message.id, highlighted }}
                  title={formatTime(message.createdAt, locale)}
                  {...getStyles('bubble')}
                >
                  {message.body}
                </Box>
                <MessageActions
                  actions={actions!}
                  text={getPreview(message)}
                  labels={{ reply: allLabels.reply }}
                  onReply={onReply && (() => onReply(message))}
                  onReact={onReact && (() => onReact(message))}
                  onEdit={onEdit && (() => onEdit(message))}
                  {...getStyles('actions')}
                />
              </Box>
              {message.attachments && (
                <Attachments
                  attachments={message.attachments}
                  locale={locale}
                  onOpen={onOpenAttachment && ((attachment) => onOpenAttachment(message, attachment))}
                  {...getStyles('attachments')}
                />
              )}
              {message.reactions && (
                <Reactions
                  reactions={message.reactions}
                  currentUserId={currentUserId}
                  onToggle={onToggleReaction && ((emoji) => onToggleReaction(message, emoji))}
                  {...getStyles('reactions')}
                />
              )}
              {groupEnd && (
                <Text component="div" size="xs" c="dimmed" {...getStyles('meta')}>
                  {formatTime(message.createdAt, locale)}
                  {own && message.id === lastOwn?.id && message.status && (
                    <Box component="span" mod={{ status: message.status }} {...getStyles('status')}>
                      {' · '}
                      {allLabels[message.status]}
                    </Box>
                  )}
                </Text>
              )}
            </Box>
          </Box>
        );
      }}
    />
  );
});

ChatThread.displayName = 'ChatThread';
ChatThread.classes = classes;
```

- [ ] **Step 3: Replace the layout rules in `ChatThread.module.css`**

Delete the `.list`, `.divider`, `.group`, `.messages`, `.row` and `.replyButton` rules (keep `.bubble`, `.quoteLabel`, `.quote`, `.content`, `.meta`, `.status`, `.author`, `.avatar`) and add:

```css
/* One message: avatar column and content */
.row {
  display: flex;
  align-items: flex-end;
  gap: var(--mantine-spacing-xs);
  max-width: 80%;
  margin-top: 2px;

  &:where([data-group-start]) {
    margin-top: var(--mantine-spacing-sm);
  }

  &:where([data-own]) {
    align-self: flex-end;
  }
}

/* Keeps follow-up messages in line with the avatar of their group */
.avatarSpace {
  flex-shrink: 0;
  width: rem(26px);
}

/* A bubble and its actions */
.line {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;

  &:where([data-own]) {
    flex-direction: row-reverse;
  }
}

/* Shown on hover, keyboard focus and while their menu is open; always where there is no hover */
.actions {
  opacity: 0;

  :where(.line:hover, .line:focus-within) > &,
  &[data-menu-open] {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
}

.reactions,
.attachments {
  :where([data-own]) > & {
    justify-content: flex-end;
  }
}
```

In `.content` keep `align-items: flex-start` / `flex-end` for own, and add `max-width: 100%`.

- [ ] **Step 4: Delete the old engine and exports**

```bash
git rm package/src/ChatThread/use-stick-to-bottom.ts package/src/utils/group-messages.ts package/src/utils/group-messages.test.ts
```

In `package/src/index.ts` delete the `groupMessages` export line and the `ThreadItem, MessageGroup, DateDivider` type export line. In `package/src/index.test.ts` delete `'groupMessages'` from the list.

- [ ] **Step 5: Run the whole suite**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: every pre-existing ChatThread test passes unchanged apart from Step 1's edits; all pass, 100%.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rebuild ChatThread on MessageList, MessageActions, Reactions and Attachments

Adds actions, onReact, onEdit, onToggleReaction, onOpenAttachment,
unreadAfterId and loading older messages. Removes groupMessages.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Stories, docs and the browser check

**Files:**
- Modify: `package/src/sample-data.ts`, `docs/demos/data.ts`, `package/src/Messages.story.tsx`
- Modify: `scripts/docgen.ts`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `docs/docs.mdx`, `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: no code API.

- [ ] **Step 1: Sample data**

In both `package/src/sample-data.ts` and `docs/demos/data.ts`, on message `m4` add:

```ts
    reactions: [{ emoji: '👍', userIds: ['me'] }],
```

and on message `m7` add:

```ts
    attachments: [
      { id: 'a1', name: 'deposit-invoice.pdf', url: '#', mimeType: 'application/pdf', size: 184320 },
    ],
```

- [ ] **Step 2: Stories**

In `package/src/Messages.story.tsx`, Messenger story: pass `unreadAfterId="m4"`, `onReact={(message) => toggle(message.id, '❤️')}` and `onToggleReaction={(message, emoji) => toggle(message.id, emoji)}` to `ChatThread`, with this helper inside the story:

```tsx
  const toggle = (id: string, emoji: string) =>
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) {
          return message;
        }

        const reactions = message.reactions ?? [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        const next = existing
          ? reactions.map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    userIds: reaction.userIds.includes('me')
                      ? reaction.userIds.filter((id) => id !== 'me')
                      : [...reaction.userIds, 'me'],
                  }
                : reaction
            )
          : [...reactions, { emoji, userIds: ['me'] }];

        return { ...message, reactions: next };
      })
    );
```

LongThread story: replace it so it starts with the newest 40 of 80 messages and loads 20 older ones at a time after 800 ms:

```tsx
export function LongThread() {
  const [count, setCount] = useState(40);
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const messages = [...longThread.slice(longThread.length - count), ...extra];

  const loadOlder = () => {
    setLoading(true);
    setTimeout(() => {
      setCount((current) => Math.min(current + 20, longThread.length));
      setLoading(false);
    }, 800);
  };

  return (
    <Box p="xl" maw={480}>
      <Paper withBorder radius="lg" h={500} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          onLoadOlder={loadOlder}
          hasOlder={count < longThread.length}
          loadingOlder={loading}
        />
        <Composer
          m="sm"
          onSend={({ text: body }) =>
            setExtra((current) => [
              ...current,
              { id: `long-new-${current.length}`, authorId: 'me', body, createdAt: new Date() },
            ])
          }
        />
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 3: Docs**

In `scripts/docgen.ts` add to `componentsPaths`: `getComponentPath('MessageList/MessageList.tsx')`, `getComponentPath('MessageActions/MessageActions.tsx')`, `getComponentPath('Reactions/Reactions.tsx')`, `getComponentPath('Attachments/Attachments.tsx')`.

In `docs/pages/index.tsx` add `'MessageList', 'MessageActions', 'Reactions', 'Attachments'` to both `componentsProps` and `componentsStyles`.

In `docs/styles-api/index.ts`, replace the ChatThread selectors with one entry per name in `ChatThreadStylesNames` (Task 6), descriptions: `root` 'Root element, a Mantine ScrollArea', `list` 'Column of messages, a live log', `divider` 'Date divider', `unread` '"New messages" line', `loader` 'Loader at the top while older messages load', `item` 'Wrapper of one message, scrolled to by jumps', `row` 'One message: avatar column and content', `avatar` 'Avatar on the last message of a group', `avatarSpace` 'Space under the avatar for other messages of a group', `content` 'Author, quote, bubble, files, reactions and time', `author` 'Name on the first message of a group', `quoteLabel` 'Caption above a reply', `quote` 'Faded copy of the answered message', `line` 'Bubble and its actions', `bubble` 'One message', `actions` 'MessageActions beside the bubble', `reactions` 'Reactions under the bubble', `attachments` 'Attachments under the bubble', `meta` 'Time under the last message of a group', `status` 'Status of your last message'; keep the existing modifiers, changing the `data-own` selector from `['group', 'bubble']` to `['row', 'bubble']`, and add `{ modifier: 'data-group-start', selector: 'row', condition: 'First message of a group' }`. Add entries `MessageList` (selectors from `MessageListStylesNames`), `MessageActions` (`root`, `action`; modifier `data-menu-open` on root), `Reactions` (`root`, `reaction`; modifier `data-active`), `Attachments` (`root`, `image`, `file`), each with `vars: {}`, and add them to `STYLES_API_DATA`.

In `docs/docs.mdx` add a section before "## Inbox":

````mdx
## Actions, reactions and files

`actions` sets the buttons beside each message: built-ins (`'reply'`, `'react'`, `'thread'`,
`'edit'`, `'copy'`) show when their handler is set, and custom items `{ id, label, icon, onClick }`
always show. After three, the rest go in a menu. Reactions and attachments on a message render
under its bubble; pass `onToggleReaction` and `onOpenAttachment` to make them interactive.

## Long threads

Pass `onLoadOlder`, `hasOlder` and `loadingOlder` to load history as the user scrolls up; the view
stays where it was while older messages are added above. `unreadAfterId` draws a "New messages"
line after the last read message.

## Building your own layout

`MessageList` is the engine under `ChatThread`: give it any items with `id`, `authorId` and
`createdAt` and a `renderItem`. It adds date dividers, groups (with `groupWith`), the unread line,
scrolling and jumps.

```tsx
<MessageList
  items={notes}
  groupWith={(previous, note) => previous.authorId === note.authorId}
  renderItem={(note, { groupStart }) => <NoteRow note={note} showName={groupStart} />}
/>
```
````

In `CHANGELOG.md` under `## Unreleased` add:

```markdown
- `MessageList` and `useMessageList`: the engine for any message layout
- `MessageActions`, `Reactions`, `Attachments`
- `ChatThread`: actions, reactions, attachments, a "New messages" line, loading older messages

### Removed

- `groupMessages` and its types; `ChatThread` groups through `MessageList`
```

- [ ] **Step 4: Gate**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test`
Expected: exit 0, 100%. Check `docs/docgen.json` contains a `MessageList` key; if docgen skipped it because of the generic cast, point docgen at nothing new for it, remove `'MessageList'` from `componentsProps` only, and note it in the commit message.

- [ ] **Step 5: Browser check (Steve watches)**

Open `http://localhost:8281/?path=/story/messages--messenger`:
- The "New messages" line sits after Maya's "Can you send me the deposit invoice…" message.
- That message shows a 👍 1 chip; clicking it removes it; hovering a message shows Reply and React; React adds ❤️.
- Your last message shows a `deposit-invoice.pdf` chip with its size.
- Grouped messages still stack with 2px gaps, the avatar sits beside the last message of Maya's group, and the time shows once per group.

Open `http://localhost:8281/?path=/story/messages--long-thread`: it opens at "Message 80 of 80"; scrolling to the top shows a loader, then older messages appear above while the message you were looking at stays put; repeat until "Message 1 of 80".

Open `?path=/story/messages--thread-only&globals=theme:dark` and confirm bubbles, reactions and file chips read well in dark mode.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Show reactions, attachments, the unread line and history loading in stories and docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After this phase

Merge `feat/engine` the same way as phase 0 (full suite on the result), push, and open a PR so CI runs. Then write the phase 2 (team chat) and phase 3 (markdown and LLM) plans; they can run in parallel.

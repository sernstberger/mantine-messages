# Phase 2: Team Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slack-style team chat built on the phase 1 engine: `Message` building-block parts, a `TeamThread` of flat rows with event rows, internal notes and thread summaries, a `ThreadPanel` that shows a thread beside the channel, `Composer` modes (Message / Internal note), and an `Inbox` with search and sections. Done when a Slack-style story looks like a real product.

**Architecture:** `Message` is a compound component (the Card / Card.Section pattern): the root owns the Styles API and shares `getStyles` with `Message.Avatar`, `Message.Body` and `Message.Meta` through context. `TeamThread` is a `renderItem` for `ChatMessage | SystemEvent` on `MessageList`, drawing each message as a `Message` (avatar, name and time on the first message of a group; compact follow-ups with the time in the avatar column on hover) and each event as a centred dimmed line. `ThreadPanel` is a header, a `TeamThread` in thread mode (`threadParentId`: the parent first, then a "N replies" divider) and a slot for a `Composer`. `Composer` gains `modes` through a Mantine `SegmentedControl`; a mode with `note: true` sets `data-note` on the root. `Inbox` gains a search `TextInput` and sections derived from `pinned` and `kind`.

**Tech Stack:** React 19, Mantine 9.8 (`factory`, `createSafeContext`, `CompoundStylesApiProps`, Styles API, `Avatar` / `Avatar.Group`, `Divider`, `CloseButton`, `SegmentedControl`, `TextInput`, `UnstyledButton`, `useUncontrolled`, `useId`), TypeScript, Jest + @mantine-tests/core + Testing Library, Storybook 8.

**Spec:** `docs/specs/2026-11-15-feature-set-design.md` (phase 2 row of "Build order", "Team chat" row of "Scenarios", "Inbox conversation list with search and sections" in the package layout). `Message.*` parts were moved here from phase 1 (agreed in chat).

## Decisions the spec left open

| Decision | Choice | Why |
|---|---|---|
| Shape of the `Message` parts | One compound component: `Message` is the root, `Message.Avatar`, `Message.Body`, `Message.Meta` read its `getStyles` from context | It is how Mantine builds Card / Card.Section: one Styles API (`classNames={{ avatar, body }}` on `Message`, one `Message.extend` in a theme) instead of four unrelated components |
| `Message.Root` | Not a separate part; `Message` itself is the root | Mantine compound components never use `.Root`; `<Message>` reads better and matches Card |
| ChatThread on `Message` parts | Left alone | Bubbles sit on two sides with the avatar on the last message of a group; moving them onto a left-aligned two-column grid is not a small, test-preserving change |
| Replies in the channel | The app passes channel messages only: `items.filter((item) => 'kind' in item \|\| !item.threadId)`; `TeamThread` shows exactly what it gets | No hidden filtering; `ThreadPanel` reuses `TeamThread` for replies, which do have `threadId` |
| Thread view inside `TeamThread` | `threadParentId` prop: that item is the parent, a "N replies" divider follows it, no thread summary or thread action, and replies never join its group | Lets `ThreadPanel` reuse every row and the engine (scrolling, unread line) instead of a second list |
| Default team actions | `['react', 'thread', 'edit', 'copy']`; edit only on your own messages | Slack's hover toolbar is react, reply in thread, more; a quote reply (`'reply'`) belongs to ChatThread, a team reply is a thread reply. With three visible, own messages show React, Thread and a More menu (Edit, Copy) |
| Open thread marker | `selectedId` prop sets `data-selected` on that row | Slack marks the message whose thread is open; the story needs it |
| Jump-to | Rows style the engine's `data-highlighted`; no external trigger in this phase | `MessageList` only exposes `jumpTo` inside `renderItem`; TeamThread has no quotes to click. An external jump (ref or prop) belongs with the work queue (phase 4), which needs it to open a timeline at an item |
| Composer modes control | Mantine `SegmentedControl` (not `Tabs`) | It is a value picker with `data`, `value`, `onChange`, `color`; `Tabs` would need panels and reads as navigation |
| Note styling hook | `ComposerMode.note?: boolean`; the root gets `data-mode="<value>"` always and `data-note` for a note mode | The app names its modes; a flag says which ones are notes so styling never depends on a magic value |
| Mode placeholder | `ComposerMode.placeholder` replaces the placeholder while that mode is chosen; the accessible name stays `placeholder` | "Only teammates see internal notes" is the clearest cue; a stable name keeps tests and screen readers steady |
| Inbox sections API | `sections?: boolean \| InboxSection[]`; `true` gives Pinned, Channels, Direct messages; an `InboxSection` is `{ id, label, match }`, first match wins, unmatched conversations are left out | One prop covers the Slack default and any custom grouping without a second `groupBy` |
| Inbox search | `withSearch` shows a `TextInput`; `search` / `defaultSearch` / `onSearchChange` filter by title even without the box | An app can put its own search field elsewhere |
| Channel prefix | `kind: 'channel'` rows show a `#` icon in the avatar and `data-channel` | Keeps the row layout; the title stays the plain channel name |
| Relative time | New `formatRelative` ("now", "5 minutes ago", "2 hours ago", "yesterday") with `Intl.RelativeTimeFormat` | Thread summaries say "Last reply 2 hours ago"; no date library |

## Global Constraints

- Peers of the root entry: `@mantine/core`, `@mantine/hooks`, `react`, `react-dom` only. No new dependencies in this phase.
- `npm test` must pass: syncpack, oxfmt format check, typecheck (package and docs), oxlint (`prefer-template`: no string concatenation, use template literals; `react/jsx-boolean-value`: write `withSearch`, not `withSearch={true}`), stylelint, Jest with 100% statements, branches, functions and lines. Each task's commit stands at 100% on its own.
- Run `npm run build && npm run docgen` before `npm test` whenever exported types or components change (the docs typecheck reads `package/dist`). Task 8 does this for the whole phase; earlier tasks run `npx tsc --noEmit`, lint and coverage.
- Every component uses `factory()`, `useProps`, the Styles API and `data-*` modifiers. State rules that must beat light/dark or hover backgrounds use `[data-x]` (and `[data-x]:hover`), not `:where()`.
- Props that clash with DOM attribute or event names need `ElementProps<'div', 'name'>`. When a component sets `mod` on its root, merge it with the app's: `mod={[{ ... }, mod]}`.
- Mantine components and hooks wherever they fit. Every Mantine API in this plan was checked in `node_modules/@mantine/core/lib` (9.8.0): `createSafeContext`, `GetStylesApi`, `CompoundStylesApiProps`, `Factory` with `compound` and `staticComponents`, `SegmentedControl` (`data`, `value`, `onChange`, `color`, `size`, `radius`, `disabled`; root has `role="radiogroup"`, items are radio inputs with labels), `Avatar` (`name`, `src`, `size`, `radius`, children replace initials), `Avatar.Group` (`spacing`), `TextInput` (`leftSection`), `CloseButton`, `Divider` (`label`, `labelPosition`), `useId` and `useUncontrolled` from `@mantine/hooks`; CSS variables `--mantine-color-yellow-light`, `--mantine-color-yellow-light-color`, `--mantine-color-yellow-filled`, `--mantine-color-anchor`, `--mantine-shadow-xs`.
- Testing lessons from phase 1:
  - jsdom has no layout; any `scrollTop` a test defines with `Object.defineProperty` must be `writable: true`.
  - `userEvent` installs its own clipboard stub; use `fireEvent` for clipboard tests.
  - `<MessageList<T>>` generic JSX works through the `MessageList` cast; keep using it.
  - `@mantine-tests/core` re-exports `render`, `screen` and `tests` but not `fireEvent` or `within`; import those from `@testing-library/react`.
  - esbuild-jest hands any file containing the text `ock(` to Babel, which is not set up. Never write that text in a test or source file (no `jest.mock(`, no names ending in `...ock(`).
- Show output in Steve's watch tab: wrap every command as `{ printf '\n$ CMD\n'; CMD 2>&1; } | tee -a .claude/run.log`.
- Format before testing: `npx oxfmt -c oxfmt.config.mjs --write package/src docs`.
- Work on a branch: `git switch -c feat/team-chat` before Task 1. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `package/src/icons.tsx` | gains `HashIcon`, `SearchIcon`, `LockIcon` |
| `package/src/utils/format.ts` | gains `formatRelative` |
| `package/src/Message/Message.tsx`, `.module.css`, `.test.tsx` (new) | `Message` root and `Message.Avatar`, `Message.Body`, `Message.Meta` |
| `package/src/TeamThread/TeamThread.tsx`, `.module.css` (new) | Slack-style rows, event rows, internal notes, thread summary, thread mode |
| `package/src/TeamThread/TeamThread.test.tsx`, `TeamThread.thread.test.tsx` (new) | Rows, groups, actions; thread summary and thread mode |
| `package/src/ThreadPanel/ThreadPanel.tsx`, `.module.css`, `.test.tsx` (new) | Header, thread, composer slot |
| `package/src/Composer/Composer.tsx`, `.module.css`, `.test.tsx` | Modes and note styling |
| `package/src/Inbox/Inbox.tsx`, `.module.css`, `.test.tsx` | Search, sections, channel rows |
| `package/src/index.ts`, `package/src/index.test.ts` | New exports |
| `package/src/sample-data.ts`, `package/src/Messages.story.tsx` | Team sample data and the Team story |
| `scripts/docgen.ts`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `docs/docs.mdx`, `CHANGELOG.md`, `README.md` | Docs |

---

### Task 1: Icons and `formatRelative`

**Files:**
- Modify: `package/src/icons.tsx`, `package/src/utils/format.ts`, `package/src/utils/format.test.ts`

**Interfaces:**
- Consumes: `toDate` (`utils/dates.ts`).
- Produces: `HashIcon`, `SearchIcon`, `LockIcon`, each `(props: { size?: number }) => JSX.Element` (the existing `icons.test.tsx` covers every export automatically); `formatRelative(value: MessageDate, locale?: string, now?: Date): string`.

- [ ] **Step 1: Write the failing test**

In `package/src/utils/format.test.ts` change the import line to:

```ts
import { formatDay, formatShort, formatTime, formatBytes, formatRelative } from './format';
```

and append (the file already declares `const now = new Date(2026, 10, 15, 12, 0);` at the top):

```ts
describe('formatRelative', () => {
  const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);
  const MINUTE = 60 * 1000;

  it('says now, minutes, hours or days ago', () => {
    expect(formatRelative(ago(30 * 1000), 'en-US', now)).toBe('now');
    expect(formatRelative(ago(5 * MINUTE), 'en-US', now)).toBe('5 minutes ago');
    expect(formatRelative(ago(2 * 60 * MINUTE), 'en-US', now)).toBe('2 hours ago');
    expect(formatRelative(ago(24 * 60 * MINUTE), 'en-US', now)).toBe('yesterday');
    expect(formatRelative(ago(3 * 24 * 60 * MINUTE), 'en-US', now)).toBe('3 days ago');
  });

  it('measures from the current time by default', () => {
    expect(formatRelative(new Date(), 'en-US')).toBe('now');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/utils/format`
Expected: FAIL, `formatRelative is not a function`.

- [ ] **Step 3: Implement**

Append to `package/src/utils/format.ts`:

```ts
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** Time from now in words: "now", "5 minutes ago", "2 hours ago", "yesterday" */
export function formatRelative(value: MessageDate, locale?: string, now = new Date()) {
  const seconds = Math.round((toDate(value).getTime() - now.getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }

  return relative.format(0, 'second');
}
```

Append to `package/src/icons.tsx`:

```tsx
export const HashIcon = icon(['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18']);
export const SearchIcon = icon(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3']);
export const LockIcon = icon(['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4']);
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add hash, search and lock icons and formatRelative

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `Message` building-block parts

**Files:**
- Create: `package/src/Message/Message.tsx`, `package/src/Message/Message.module.css`, `package/src/Message/Message.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Message` (root, `factory`), with statics `Message.Avatar`, `Message.Body`, `Message.Meta`
  - `MessageStylesNames = 'root' | 'avatar' | 'body' | 'meta'`
  - `MessageProps extends BoxProps, StylesApiProps<MessageFactory>, ElementProps<'div'>`: `compact?: boolean` (sets `data-compact`)
  - `MessageAvatarProps`: `name: string`, `src?: string | null` (a Mantine `Avatar`, 36px, radius `md`)
  - `MessageBodyProps`, `MessageMetaProps`: `BoxProps` + `ElementProps<'div'>` + `CompoundStylesApiProps`
  - Each part accepts `className`, `style`, `classNames`, `styles` and merges them through the root's `getStyles`, so a layout spreads its own `getStyles('part')` on a part.
  - Layout: the root is a two-column grid (36px avatar column, content column). `Message.Avatar` sits in the first column, `Message.Body` in the second. A `Message.Meta` that is a direct child of the root goes in the avatar column as a small dimmed time shown on hover and focus (compact follow-ups); a `Message.Meta` inside `Message.Body` is the name-and-time line.
  - Using a part outside `Message` throws `Message.Avatar, Message.Body and Message.Meta must be used inside Message`.

- [ ] **Step 1: Write the failing test**

`package/src/Message/Message.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import React from 'react';
import { Message, MessageProps, MessageStylesNames } from './Message';

const defaultProps: MessageProps = {
  children: [
    <Message.Avatar key="avatar" name="Maya Lindqvist" />,
    <Message.Body key="body">
      <Message.Meta>Maya Lindqvist · 9:41</Message.Meta>
      Hello
    </Message.Body>,
  ],
};

describe('Message', () => {
  tests.itSupportsSystemProps<MessageProps, MessageStylesNames>({
    component: Message,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Message',
    stylesApiSelectors: ['root', 'avatar', 'body', 'meta'],
  });

  it('renders an avatar with initials, a meta line and the text', () => {
    render(<Message {...defaultProps} />);
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('Maya Lindqvist · 9:41')).toHaveClass('mantine-Message-meta');
    expect(screen.getByText('Hello')).toHaveClass('mantine-Message-body');
  });

  it('marks a follow-up as compact and keeps the app mod', () => {
    const { container } = render(
      <Message compact mod={{ internal: true }}>
        <Message.Meta>9:42</Message.Meta>
        <Message.Body>Again</Message.Body>
      </Message>
    );
    const root = container.querySelector('.mantine-Message-root');
    expect(root).toHaveAttribute('data-compact');
    expect(root).toHaveAttribute('data-internal');
  });

  it('takes className and style on each part', () => {
    render(
      <Message>
        <Message.Body className="note" style={{ color: 'red' }}>
          Hi
        </Message.Body>
      </Message>
    );
    expect(screen.getByText('Hi')).toHaveClass('note', 'mantine-Message-body');
    expect(screen.getByText('Hi')).toHaveStyle({ color: 'red' });
  });

  it('throws when a part is used outside Message', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Message.Body>Hi</Message.Body>)).toThrow(
      'Message.Avatar, Message.Body and Message.Meta must be used inside Message'
    );
    error.mockRestore();
  });
});
```

In `package/src/index.test.ts` replace the expected list with:

```ts
    expect(Object.keys(messages).sort()).toEqual([
      'Attachments',
      'ChatThread',
      'Composer',
      'Inbox',
      'Message',
      'MessageActions',
      'MessageList',
      'MessageListBase',
      'Reactions',
      'getPreview',
      'stripMarkdown',
      'truncate',
      'useMessageList',
    ]);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/Message package/src/index`
Expected: FAIL, `Cannot find module './Message'`, and the index test lacks `'Message'`.

- [ ] **Step 3: Implement**

`package/src/Message/Message.tsx`:

```tsx
import {
  Avatar,
  Box,
  BoxProps,
  CompoundStylesApiProps,
  createSafeContext,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import classes from './Message.module.css';

export type MessageStylesNames = 'root' | 'avatar' | 'body' | 'meta';

interface MessageContextValue {
  getStyles: GetStylesApi<MessageFactory>;
}

const [MessageProvider, useMessageContext] = createSafeContext<MessageContextValue>(
  'Message.Avatar, Message.Body and Message.Meta must be used inside Message'
);

export interface MessageAvatarProps
  extends BoxProps, CompoundStylesApiProps<MessageAvatarFactory>, ElementProps<'div'> {
  /** Name of the author, for the initials and the image's alt text */
  name: string;

  /** Image url; initials are shown when it is missing */
  src?: string | null;
}

export type MessageAvatarFactory = Factory<{
  props: MessageAvatarProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Avatar in the first column */
export const MessageAvatar = factory<MessageAvatarFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, name, src, ...others } = useProps(
    'MessageAvatar',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Avatar
      ref={ref}
      src={src}
      name={name}
      alt={name}
      size={36}
      radius="md"
      {...ctx.getStyles('avatar', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessageAvatar.displayName = 'MessageAvatar';
MessageAvatar.classes = classes;

export interface MessageBodyProps
  extends BoxProps, CompoundStylesApiProps<MessageBodyFactory>, ElementProps<'div'> {}

export type MessageBodyFactory = Factory<{
  props: MessageBodyProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Content column: meta line, text and anything under it */
export const MessageBody = factory<MessageBodyFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessageBody',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Box ref={ref} {...ctx.getStyles('body', { className, style, classNames, styles })} {...others} />
  );
});

MessageBody.displayName = 'MessageBody';
MessageBody.classes = classes;

export interface MessageMetaProps
  extends BoxProps, CompoundStylesApiProps<MessageMetaFactory>, ElementProps<'div'> {}

export type MessageMetaFactory = Factory<{
  props: MessageMetaProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  compound: true;
}>;

/** Name and time above the text; directly in `Message`, a time in the avatar column shown on hover */
export const MessageMeta = factory<MessageMetaFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessageMeta',
    {},
    _props
  );
  const ctx = useMessageContext();

  return (
    <Box ref={ref} {...ctx.getStyles('meta', { className, style, classNames, styles })} {...others} />
  );
});

MessageMeta.displayName = 'MessageMeta';
MessageMeta.classes = classes;

export interface MessageProps
  extends BoxProps, StylesApiProps<MessageFactory>, ElementProps<'div'> {
  /** A follow-up message of a group; sets `data-compact` for tighter spacing */
  compact?: boolean;
}

export type MessageFactory = Factory<{
  props: MessageProps;
  ref: HTMLDivElement;
  stylesNames: MessageStylesNames;
  staticComponents: {
    Avatar: typeof MessageAvatar;
    Body: typeof MessageBody;
    Meta: typeof MessageMeta;
  };
}>;

/** One message as a row: an avatar column and a content column */
export const Message = factory<MessageFactory>((_props) => {
  const props = useProps('Message', {}, _props);
  const { classNames, className, style, styles, unstyled, vars, ref, compact, mod, ...others } =
    props;

  const getStyles = useStyles<MessageFactory>({
    name: 'Message',
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
    <MessageProvider value={{ getStyles }}>
      <Box ref={ref} mod={[{ compact }, mod]} {...getStyles('root')} {...others} />
    </MessageProvider>
  );
});

Message.displayName = 'Message';
Message.classes = classes;
Message.Avatar = MessageAvatar;
Message.Body = MessageBody;
Message.Meta = MessageMeta;
```

`package/src/Message/Message.module.css`:

```css
/* Avatar column and content column */
.root {
  display: grid;
  grid-template-columns: rem(36px) minmax(0, 1fr);
  column-gap: var(--mantine-spacing-sm);
  align-items: start;
}

.avatar {
  grid-column: 1;
}

.body {
  grid-column: 2;
  min-width: 0;
}

/* Name and time above the text */
.meta {
  display: flex;
  align-items: baseline;
  gap: var(--mantine-spacing-xs);
  min-width: 0;

  /* Directly in the root: a small time in the avatar column, shown on hover and focus */
  :where(.root) > & {
    grid-column: 1;
    justify-content: flex-end;
    font-size: rem(10px);
    color: var(--mantine-color-dimmed);
    white-space: nowrap;
    opacity: 0;
  }

  :where(.root:hover, .root:focus-within) > & {
    opacity: 1;
  }
}
```

In `package/src/index.ts` append:

```ts
export { Message } from './Message/Message';
export type {
  MessageProps,
  MessageFactory,
  MessageStylesNames,
  MessageAvatarProps,
  MessageBodyProps,
  MessageMetaProps,
} from './Message/Message';
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%. If `tests.itSupportsSystemProps` reports a missing `avatar`, `body` or `meta` selector, check that each part spreads `ctx.getStyles(...)` before `{...others}`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Message with Message.Avatar, Message.Body and Message.Meta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `TeamThread`

**Files:**
- Create: `package/src/TeamThread/TeamThread.tsx`, `package/src/TeamThread/TeamThread.module.css`, `package/src/TeamThread/TeamThread.test.tsx`, `package/src/TeamThread/TeamThread.thread.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: `Message` (Task 2); `formatRelative`, `LockIcon` (Task 1); `MessageList`, `MessageActions`, `MessageAction`, `Reactions`, `Attachments` (phase 1); `formatTime`, `toDate`, `getPreview`; types `ChatMessage`, `SystemEvent`, `MessagesUser`, `MessageAttachment`, `MessageThreadSummary`.
- Produces:
  - `TeamThreadItem = ChatMessage | SystemEvent`
  - `TeamThread` component (`factory`), ref `HTMLDivElement`
  - `TeamThreadProps`: `items: TeamThreadItem[]`, `users: MessagesUser[]`, `currentUserId: string`, `locale?`, `groupWindow?` (default 5 minutes), `autoScroll?` (default `true`), `actions?: MessageAction[]` (default `['react', 'thread', 'edit', 'copy']`), `onOpenThread?(message)`, `onReact?(message)`, `onEdit?(message)` (own messages only), `onToggleReaction?(message, emoji)`, `onOpenAttachment?(message, attachment)`, `selectedId?: string | null`, `threadParentId?: string`, `unreadAfterId?`, `onLoadOlder?`, `hasOlder?`, `loadingOlder?`, `labels?: Partial<TeamThreadLabels>`
  - `TeamThreadLabels { replies(count): string; lastReply(time): string; edited: string; internal: string; newMessages: string }`, defaults `'1 reply'` / `'12 replies'`, `'Last reply 2 hours ago'`, `'(edited)'`, `'Internal note'`, `'New messages'`
  - `TeamThreadStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item' | 'row' | 'avatar' | 'gutterTime' | 'body' | 'meta' | 'author' | 'time' | 'noteLabel' | 'text' | 'edited' | 'actions' | 'attachments' | 'reactions' | 'threadSummary' | 'repliesDivider' | 'event'`
  - Each message row is a `Message` with `data-message-id`, `data-compact` (follow-ups), `data-internal`, `data-selected`, `data-highlighted`.
  - Groups: same author, same visibility, within `groupWindow`; events and the thread parent never join a group.

- [ ] **Step 1: Write the failing row tests**

`package/src/TeamThread/TeamThread.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ChatMessage, MessagesUser, SystemEvent } from '../types';
import { TeamThread, TeamThreadItem, TeamThreadProps, TeamThreadStylesNames } from './TeamThread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const message = (
  id: string,
  authorId: string,
  minute: number,
  extra: Partial<ChatMessage> = {}
): ChatMessage => ({ id, authorId, body: `Body ${id}`, createdAt: at(minute), ...extra });

const event = (id: string, minute: number): SystemEvent => ({
  id,
  kind: 'event',
  authorId: 'theo',
  text: 'Theo joined #launch',
  createdAt: at(minute),
});

const items: TeamThreadItem[] = [event('e', 0), message('a', 'maya', 1), message('b', 'maya', 2)];
const defaultProps: TeamThreadProps = { items, users, currentUserId: 'me' };

const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`)!;

describe('TeamThread', () => {
  tests.itSupportsSystemProps<TeamThreadProps, TeamThreadStylesNames>({
    component: TeamThread,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'TeamThread',
    stylesApiSelectors: [
      'root',
      'list',
      'divider',
      'item',
      'row',
      'avatar',
      'gutterTime',
      'body',
      'meta',
      'author',
      'time',
      'text',
      'actions',
      'event',
    ],
  });

  it('is a live log with an event line and a name on the first message of a group', () => {
    render(<TeamThread {...defaultProps} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('Theo joined #launch')).toHaveClass('mantine-TeamThread-event');
    expect(screen.getAllByText('Maya Lindqvist')).toHaveLength(1);
    expect(row('a')).not.toHaveAttribute('data-compact');
    expect(row('b')).toHaveAttribute('data-compact');
  });

  it('groups by author, time and visibility; events break groups', () => {
    render(
      <TeamThread
        {...defaultProps}
        items={[
          message('a', 'maya', 1),
          message('b', 'maya', 2),
          message('c', 'maya', 3, { visibility: 'internal' }),
          message('d', 'maya', 4, { visibility: 'internal' }),
          message('e', 'maya', 5),
          message('f', 'maya', 30),
          message('g', 'theo', 31),
          event('h', 32),
          message('i', 'theo', 33),
        ]}
      />
    );
    expect(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'i'].map((id) => row(id).hasAttribute('data-compact'))
    ).toEqual([false, true, false, true, false, false, false, false]);
  });

  it('marks internal notes and edited messages, with custom labels', () => {
    const note = message('a', 'maya', 1, { visibility: 'internal', editedAt: at(2) });
    const { rerender } = render(<TeamThread {...defaultProps} items={[note]} />);
    expect(row('a')).toHaveAttribute('data-internal');
    expect(screen.getByText('Internal note')).toBeInTheDocument();
    expect(screen.getByText('(edited)')).toBeInTheDocument();

    rerender(
      <TeamThread
        {...defaultProps}
        items={[note]}
        labels={{ internal: 'Team only', edited: '(changed)' }}
      />
    );
    expect(screen.getByText('Team only')).toBeInTheDocument();
    expect(screen.getByText('(changed)')).toBeInTheDocument();
  });

  it('falls back to the author id for unknown users', () => {
    render(<TeamThread {...defaultProps} items={[message('x', 'ghost', 1)]} />);
    expect(screen.getByText('ghost')).toBeInTheDocument();
  });

  it('shows react and thread, with edit for own messages and copy in the menu', async () => {
    const onReact = jest.fn();
    const onOpenThread = jest.fn();
    const onEdit = jest.fn();
    const own = message('m', 'me', 1);
    const other = message('o', 'maya', 30);
    render(
      <TeamThread
        {...defaultProps}
        items={[own, other]}
        onReact={onReact}
        onOpenThread={onOpenThread}
        onEdit={onEdit}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'React: Body o' }));
    expect(onReact).toHaveBeenCalledWith(other);
    await userEvent.click(screen.getByRole('button', { name: 'Reply in thread: Body o' }));
    expect(onOpenThread).toHaveBeenCalledWith(other);
    expect(screen.getByRole('button', { name: 'Copy: Body o' })).toBeInTheDocument();

    // Own message: react, thread, edit, copy is four, so edit and copy go in the menu
    expect(screen.getAllByRole('button', { name: 'More actions' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(own);
  });

  it('shows reactions and files, interactive with handlers', async () => {
    const onToggleReaction = jest.fn();
    const onOpenAttachment = jest.fn();
    const attachment = { id: 'f', name: 'notes.pdf', url: '#', size: 2048 };
    const withExtras = message('x', 'maya', 1, {
      reactions: [{ emoji: '👍', userIds: ['me'] }],
      attachments: [attachment],
    });
    render(
      <TeamThread
        {...defaultProps}
        items={[withExtras]}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: '👍 1, including you' }));
    expect(onToggleReaction).toHaveBeenCalledWith(withExtras, '👍');
    await userEvent.click(screen.getByRole('button', { name: /notes\.pdf/ }));
    expect(onOpenAttachment).toHaveBeenCalledWith(withExtras, attachment);
  });

  it('passes the unread line and history loading to the list', () => {
    const { container } = render(
      <TeamThread
        {...defaultProps}
        unreadAfterId="a"
        loadingOlder
        hasOlder
        onLoadOlder={() => {}}
        labels={{ newMessages: 'Unread' }}
      />
    );
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(container.querySelector('.mantine-TeamThread-loader')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing thread tests**

`package/src/TeamThread/TeamThread.thread.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ChatMessage, MessagesUser } from '../types';
import { TeamThread, TeamThreadItem } from './TeamThread';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const parent: ChatMessage = {
  id: 'p',
  authorId: 'maya',
  body: 'Launch checklist',
  createdAt: hoursAgo(5),
  thread: { count: 12, lastReplyAt: hoursAgo(2), participantIds: ['theo', 'me', 'ghost', 'maya'] },
};

const row = (id: string) => document.querySelector(`[data-message-id="${id}"]`)!;

describe('TeamThread threads', () => {
  it('shows a thread summary under a parent and opens the thread', async () => {
    const onOpenThread = jest.fn();
    render(
      <TeamThread
        items={[parent]}
        users={users}
        currentUserId="me"
        locale="en-US"
        onOpenThread={onOpenThread}
      />
    );
    const summary = screen.getByRole('button', { name: /12 replies/ });
    expect(summary).toHaveTextContent('Last reply 2 hours ago');
    expect(summary.querySelectorAll('.mantine-Avatar-root')).toHaveLength(3);

    await userEvent.click(summary);
    expect(onOpenThread).toHaveBeenCalledWith(parent);
    await userEvent.click(screen.getByRole('button', { name: 'Reply in thread: Launch checklist' }));
    expect(onOpenThread).toHaveBeenCalledTimes(2);
  });

  it('says 1 reply as plain text without onOpenThread, and hides empty threads', () => {
    const { rerender } = render(
      <TeamThread
        items={[{ ...parent, thread: { ...parent.thread!, count: 1 } }]}
        users={users}
        currentUserId="me"
      />
    );
    expect(screen.getByText('1 reply')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1 reply/ })).not.toBeInTheDocument();

    rerender(
      <TeamThread
        items={[{ ...parent, thread: { ...parent.thread!, count: 0 } }]}
        users={users}
        currentUserId="me"
      />
    );
    expect(screen.queryByText('0 replies')).not.toBeInTheDocument();
  });

  it('in a thread: a replies divider after the parent, no summary or thread action', () => {
    const inThread: TeamThreadItem[] = [
      { ...parent, createdAt: at(1) },
      { id: 'r1', authorId: 'maya', body: 'First', createdAt: at(2), threadId: 'p' },
      { id: 'e', kind: 'event', authorId: 'theo', text: 'Theo joined', createdAt: at(3) },
      { id: 'r2', authorId: 'theo', body: 'Second', createdAt: at(4), threadId: 'p' },
    ];
    render(
      <TeamThread
        items={inThread}
        threadParentId="p"
        users={users}
        currentUserId="me"
        onOpenThread={jest.fn()}
      />
    );
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.queryByText('12 replies')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reply in thread/ })).not.toBeInTheDocument();
    // Maya's first reply comes a minute after her parent message but starts its own group
    expect(row('r1')).not.toHaveAttribute('data-compact');
  });

  it('marks the selected message', () => {
    render(<TeamThread items={[parent]} users={users} currentUserId="me" selectedId="p" />);
    expect(row('p')).toHaveAttribute('data-selected');
  });
});
```

In `package/src/index.test.ts` add `'TeamThread',` after `'Reactions',` in the expected list.

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest package/src/TeamThread package/src/index`
Expected: FAIL, `Cannot find module './TeamThread'`, and the index test lacks `'TeamThread'`.

- [ ] **Step 4: Implement**

`package/src/TeamThread/TeamThread.tsx`:

```tsx
import {
  Avatar,
  Box,
  BoxProps,
  Divider,
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
import { LockIcon } from '../icons';
import { Message } from '../Message/Message';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList } from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type {
  ChatMessage,
  MessageAttachment,
  MessagesUser,
  MessageThreadSummary,
  SystemEvent,
} from '../types';
import { toDate } from '../utils/dates';
import { formatRelative, formatTime } from '../utils/format';
import { getPreview } from '../utils/preview';
import classes from './TeamThread.module.css';

/** What a team channel shows: messages and events such as "Maya joined" */
export type TeamThreadItem = ChatMessage | SystemEvent;

export type TeamThreadStylesNames =
  | 'root'
  | 'list'
  | 'divider'
  | 'unread'
  | 'loader'
  | 'item'
  | 'row'
  | 'avatar'
  | 'gutterTime'
  | 'body'
  | 'meta'
  | 'author'
  | 'time'
  | 'noteLabel'
  | 'text'
  | 'edited'
  | 'actions'
  | 'attachments'
  | 'reactions'
  | 'threadSummary'
  | 'repliesDivider'
  | 'event';

export interface TeamThreadLabels {
  /** Reply count in a thread summary and in the divider of a thread */
  replies: (count: number) => string;

  /** After the reply count, for example "Last reply 2 hours ago" */
  lastReply: (time: string) => string;

  /** After the text of an edited message */
  edited: string;

  /** Above the text of an internal note */
  internal: string;

  /** Line above the first unread message */
  newMessages: string;
}

export interface TeamThreadProps
  extends BoxProps, StylesApiProps<TeamThreadFactory>, ElementProps<'div'> {
  /** Messages and events, oldest first; pass channel messages only, not thread replies */
  items: TeamThreadItem[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking; the list follows their new messages and only they can edit theirs */
  currentUserId: string;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Longest gap, in milliseconds, between two messages of one group, 5 minutes by default */
  groupWindow?: number;

  /** Keep the newest message in view, `true` by default */
  autoScroll?: boolean;

  /** Actions on hover; a built-in shows only when its handler is set, `['react', 'thread', 'edit', 'copy']` by default */
  actions?: MessageAction[];

  /** Called with a message whose thread the user opens, from its summary or the thread action */
  onOpenThread?: (message: ChatMessage) => void;

  /** Called when the user asks to react to a message, for example to open an emoji picker */
  onReact?: (message: ChatMessage) => void;

  /** Called when the user asks to edit one of their own messages */
  onEdit?: (message: ChatMessage) => void;

  /** Called when the user clicks a reaction; makes reactions toggle buttons */
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;

  /** Called when the user opens an attachment; without it attachments are links */
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the message whose thread is open; marked with `data-selected` */
  selectedId?: string | null;

  /**
   * Shows the list as one thread: the item with this `id` is the parent, a divider with the reply
   * count follows it, and there are no thread summaries or thread actions
   */
  threadParentId?: string;

  /** `id` of the last read item; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More items exist before the first one */
  hasOlder?: boolean;

  /** Older items are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text, for translation */
  labels?: Partial<TeamThreadLabels>;
}

export type TeamThreadFactory = Factory<{
  props: TeamThreadProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadStylesNames;
}>;

const defaultLabels: TeamThreadLabels = {
  replies: (count) => (count === 1 ? '1 reply' : `${count} replies`),
  lastReply: (time) => `Last reply ${time}`,
  edited: '(edited)',
  internal: 'Internal note',
  newMessages: 'New messages',
};

const defaultProps: Partial<TeamThreadProps> = {
  groupWindow: 5 * 60 * 1000,
  autoScroll: true,
  actions: ['react', 'thread', 'edit', 'copy'],
};

// Parts of the inner MessageList that TeamThread's Styles API also styles
const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

const isEvent = (item: TeamThreadItem): item is SystemEvent => 'kind' in item;
const isInternal = (message: ChatMessage) => message.visibility === 'internal';

export const TeamThread = factory<TeamThreadFactory>((_props) => {
  const props = useProps('TeamThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    items,
    users,
    currentUserId,
    locale,
    groupWindow,
    autoScroll,
    actions,
    onOpenThread,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    selectedId,
    threadParentId,
    unreadAfterId,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<TeamThreadFactory>({
    name: 'TeamThread',
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
  const allLabels = { ...defaultLabels, ...labels };
  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;
  const replyCount = items.filter((item) => !isEvent(item) && item.id !== threadParentId).length;

  // Same author, same visibility, close in time; events and the parent of a thread stand alone
  const sameGroup = (previous: TeamThreadItem, item: TeamThreadItem) =>
    !isEvent(previous) &&
    !isEvent(item) &&
    previous.id !== threadParentId &&
    previous.authorId === item.authorId &&
    isInternal(previous) === isInternal(item) &&
    toDate(item.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow!;

  // "12 replies  Last reply 2 hours ago" with the first three people who answered
  const renderThreadSummary = (message: ChatMessage, thread: MessageThreadSummary) => {
    const content = (
      <>
        <Avatar.Group spacing={6} aria-hidden>
          {thread.participantIds.slice(0, 3).map((id) => (
            <Avatar
              key={id}
              size={20}
              radius="sm"
              src={usersById.get(id)?.avatar}
              name={nameOf(id)}
            />
          ))}
        </Avatar.Group>
        <Text component="span" size="xs" fw={700} c="var(--mantine-color-anchor)">
          {allLabels.replies(thread.count)}
        </Text>
        <Text component="span" size="xs" c="dimmed">
          {allLabels.lastReply(formatRelative(thread.lastReplyAt, locale))}
        </Text>
      </>
    );

    return onOpenThread ? (
      <UnstyledButton onClick={() => onOpenThread(message)} {...getStyles('threadSummary')}>
        {content}
      </UnstyledButton>
    ) : (
      <Box {...getStyles('threadSummary')}>{content}</Box>
    );
  };

  const renderMessage = (message: ChatMessage, groupStart: boolean, highlighted: boolean) => {
    const author = usersById.get(message.authorId);
    const name = nameOf(message.authorId);
    const time = formatTime(message.createdAt, locale);
    const own = message.authorId === currentUserId;
    const internal = isInternal(message);
    const { thread } = message;

    return (
      <Message
        compact={!groupStart}
        mod={{
          internal,
          selected: message.id === selectedId,
          highlighted,
          'message-id': message.id,
        }}
        unstyled={unstyled}
        {...getStyles('row')}
      >
        {groupStart ? (
          <Message.Avatar src={author?.avatar} name={name} {...getStyles('avatar')} />
        ) : (
          <Message.Meta {...getStyles('gutterTime')}>{time}</Message.Meta>
        )}
        <Message.Body {...getStyles('body')}>
          {groupStart && (
            <Message.Meta {...getStyles('meta')}>
              <Text component="span" size="sm" fw={700} {...getStyles('author')}>
                {name}
              </Text>
              <Text component="span" size="xs" c="dimmed" {...getStyles('time')}>
                {time}
              </Text>
            </Message.Meta>
          )}
          {internal && (
            <Text component="div" size="xs" fw={600} {...getStyles('noteLabel')}>
              <LockIcon size={12} />
              {allLabels.internal}
            </Text>
          )}
          <Box {...getStyles('text')}>
            {message.body}
            {message.editedAt !== undefined && (
              <Text component="span" size="xs" c="dimmed" {...getStyles('edited')}>
                {allLabels.edited}
              </Text>
            )}
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
          {thread && thread.count > 0 && !threadParentId && renderThreadSummary(message, thread)}
        </Message.Body>
        <MessageActions
          actions={actions!}
          text={getPreview(message)}
          onReact={onReact && (() => onReact(message))}
          onThread={onOpenThread && !threadParentId ? () => onOpenThread(message) : undefined}
          onEdit={onEdit && own ? () => onEdit(message) : undefined}
          {...getStyles('actions')}
        />
      </Message>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <MessageList<TeamThreadItem>
      ref={ref}
      items={items}
      groupWith={sameGroup}
      isOwn={(item) => item.authorId === currentUserId}
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
      renderItem={(item, { groupStart, highlighted }) => {
        if (isEvent(item)) {
          return (
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              title={formatTime(item.createdAt, locale)}
              {...getStyles('event')}
            >
              {item.text}
            </Text>
          );
        }

        return (
          <>
            {renderMessage(item, groupStart, highlighted)}
            {item.id === threadParentId && (
              <Divider
                label={allLabels.replies(replyCount)}
                labelPosition="left"
                {...getStyles('repliesDivider')}
              />
            )}
          </>
        );
      }}
    />
  );
});

TeamThread.displayName = 'TeamThread';
TeamThread.classes = classes;
```

`package/src/TeamThread/TeamThread.module.css`:

```css
/* Rows run edge to edge, so hover and note backgrounds fill the width */
.root .list {
  padding-inline: 0;
}

/* One message, a Message */
.row {
  position: relative;
  padding: 2px var(--mantine-spacing-md);

  &:where(:not([data-compact])) {
    margin-top: var(--mantine-spacing-xs);
    padding-top: 6px;
  }

  @mixin hover {
    @mixin light {
      background-color: var(--mantine-color-gray-0);
    }

    @mixin dark {
      background-color: var(--mantine-color-dark-6);
    }
  }

  /* not :where(), and :hover too, so these beat the hover backgrounds above */
  &[data-internal],
  &[data-internal]:hover {
    background-color: var(--mantine-color-yellow-light);
    box-shadow: inset 3px 0 0 var(--mantine-color-yellow-filled);
  }

  &[data-selected],
  &[data-selected]:hover,
  &[data-highlighted],
  &[data-highlighted]:hover {
    background-color: var(--mantine-primary-color-light);
  }
}

.avatar {
  margin-top: 2px;
}

/* Lines up with the first line of the text */
.gutterTime {
  line-height: rem(21px);
}

.meta {
  margin-bottom: 2px;
}

.author {
  color: var(--mantine-color-text);
}

.noteLabel {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--mantine-color-yellow-light-color);
}

.text {
  font-size: var(--mantine-font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.edited {
  margin-inline-start: 4px;
}

/* Toolbar over the top right corner; shown on hover, keyboard focus and while its menu is open */
.actions {
  position: absolute;
  top: -14px;
  right: var(--mantine-spacing-md);
  z-index: 1;
  padding: 2px;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-md);
  background-color: var(--mantine-color-body);
  box-shadow: var(--mantine-shadow-xs);
  opacity: 0;
  pointer-events: none;

  :where(.row:hover, .row:focus-within) > &,
  &[data-menu-open] {
    opacity: 1;
    pointer-events: auto;
  }
}

/* "12 replies  Last reply 2 hours ago" */
.threadSummary {
  display: inline-flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  margin-top: 4px;
  padding: 2px 8px 2px 2px;
  border: 1px solid transparent;
  border-radius: var(--mantine-radius-md);

  @mixin hover {
    border-color: var(--mantine-color-default-border);
    background-color: var(--mantine-color-body);
  }
}

.repliesDivider {
  margin: var(--mantine-spacing-xs) var(--mantine-spacing-md);
}

.event {
  margin-top: var(--mantine-spacing-xs);
  padding: 4px var(--mantine-spacing-md);
}
```

In `package/src/index.ts` append:

```ts
export { TeamThread } from './TeamThread/TeamThread';
export type {
  TeamThreadProps,
  TeamThreadFactory,
  TeamThreadStylesNames,
  TeamThreadLabels,
  TeamThreadItem,
} from './TeamThread/TeamThread';
```

- [ ] **Step 5: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%. If a branch in `TeamThread.tsx` is uncovered, read the coverage line before adding a test; every `&&` and `?:` above is exercised by the two test files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add TeamThread: Slack-style rows, events, internal notes and thread summaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `ThreadPanel`

**Files:**
- Create: `package/src/ThreadPanel/ThreadPanel.tsx`, `package/src/ThreadPanel/ThreadPanel.module.css`, `package/src/ThreadPanel/ThreadPanel.test.tsx`
- Modify: `package/src/index.ts`, `package/src/index.test.ts`

**Interfaces:**
- Consumes: `TeamThread`, `TeamThreadLabels` (Task 3); `MessageAction`; types `ChatMessage`, `MessageAttachment`, `MessagesUser`.
- Produces:
  - `ThreadPanel` component (`factory`), ref `HTMLDivElement`; root has `role="complementary"` and `aria-label` = the title
  - `ThreadPanelProps`: `parent: ChatMessage`, `replies: ChatMessage[]`, `users`, `currentUserId`, `subtitle?: ReactNode` (for example `'#launch'`), `onClose?()` (shows a `CloseButton`), `locale?`, `actions?`, `onReact?`, `onEdit?`, `onToggleReaction?`, `onOpenAttachment?`, `unreadAfterId?`, `labels?: Partial<ThreadPanelLabels>`, `children?: ReactNode` (the composer slot)
  - `ThreadPanelLabels extends TeamThreadLabels { title: string; close: string }`, defaults `'Thread'`, `'Close thread'`
  - `ThreadPanelStylesNames = 'root' | 'header' | 'heading' | 'title' | 'subtitle' | 'close' | 'thread' | 'composer'`

- [ ] **Step 1: Write the failing test**

`package/src/ThreadPanel/ThreadPanel.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer } from '../Composer/Composer';
import type { ChatMessage, MessagesUser } from '../types';
import { ThreadPanel, ThreadPanelProps, ThreadPanelStylesNames } from './ThreadPanel';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const parent: ChatMessage = {
  id: 'p',
  authorId: 'maya',
  body: 'Launch checklist',
  createdAt: at(1),
  thread: { count: 2, lastReplyAt: at(5), participantIds: ['theo', 'me'] },
};

const replies: ChatMessage[] = [
  { id: 'r1', authorId: 'theo', body: 'Release notes are mine', createdAt: at(2), threadId: 'p' },
  { id: 'r2', authorId: 'me', body: 'Pricing copy too', createdAt: at(5), threadId: 'p' },
];

const defaultProps: ThreadPanelProps = {
  parent,
  replies,
  users,
  currentUserId: 'me',
  subtitle: '#launch',
  onClose: () => {},
  children: <Composer />,
};

describe('ThreadPanel', () => {
  tests.itSupportsSystemProps<ThreadPanelProps, ThreadPanelStylesNames>({
    component: ThreadPanel,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'ThreadPanel',
    stylesApiSelectors: [
      'root',
      'header',
      'heading',
      'title',
      'subtitle',
      'close',
      'thread',
      'composer',
    ],
  });

  it('is a labelled panel with the parent, a replies divider, the replies and the composer', () => {
    render(<ThreadPanel {...defaultProps} />);
    expect(screen.getByRole('complementary', { name: 'Thread' })).toBeInTheDocument();
    expect(screen.getByText('#launch')).toBeInTheDocument();
    expect(screen.getByText('Launch checklist')).toBeInTheDocument();
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.getByText('Pricing copy too')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  });

  it('closes with its button and takes custom labels', async () => {
    const onClose = jest.fn();
    render(
      <ThreadPanel
        {...defaultProps}
        onClose={onClose}
        labels={{ title: 'Replies', close: 'Hide replies', replies: (count) => `${count} answers` }}
      />
    );
    expect(screen.getByRole('complementary', { name: 'Replies' })).toBeInTheDocument();
    expect(screen.getByText('2 answers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide replies' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves out the subtitle, close button and composer when not given', () => {
    const { container } = render(
      <ThreadPanel parent={parent} replies={replies} users={users} currentUserId="me" />
    );
    expect(screen.queryByRole('button', { name: 'Close thread' })).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-subtitle')).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-composer')).not.toBeInTheDocument();
  });

  it('passes handlers to the rows', async () => {
    const onReact = jest.fn();
    render(<ThreadPanel {...defaultProps} onReact={onReact} />);
    await userEvent.click(screen.getByRole('button', { name: 'React: Release notes are mine' }));
    expect(onReact).toHaveBeenCalledWith(replies[0]);
  });
});
```

In `package/src/index.test.ts` add `'ThreadPanel',` after `'TeamThread',` in the expected list.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/ThreadPanel package/src/index`
Expected: FAIL, `Cannot find module './ThreadPanel'`, and the index test lacks `'ThreadPanel'`.

- [ ] **Step 3: Implement**

`package/src/ThreadPanel/ThreadPanel.tsx`:

```tsx
import {
  Box,
  BoxProps,
  CloseButton,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Text,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import type { MessageAction } from '../MessageActions/MessageActions';
import { TeamThread, type TeamThreadLabels } from '../TeamThread/TeamThread';
import type { ChatMessage, MessageAttachment, MessagesUser } from '../types';
import classes from './ThreadPanel.module.css';

export type ThreadPanelStylesNames =
  | 'root'
  | 'header'
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'close'
  | 'thread'
  | 'composer';

export interface ThreadPanelLabels extends TeamThreadLabels {
  /** Heading of the panel, also its accessible name */
  title: string;

  /** Accessible label of the close button */
  close: string;
}

export interface ThreadPanelProps
  extends BoxProps, StylesApiProps<ThreadPanelFactory>, ElementProps<'div'> {
  /** The message the thread belongs to */
  parent: ChatMessage;

  /** Replies, oldest first */
  replies: ChatMessage[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking */
  currentUserId: string;

  /** Under the title, for example the channel name */
  subtitle?: React.ReactNode;

  /** Called when the user closes the panel; shows a close button */
  onClose?: () => void;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Actions on hover, as in `TeamThread` */
  actions?: MessageAction[];
  onReact?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the last read reply; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Text, for translation */
  labels?: Partial<ThreadPanelLabels>;

  /** Shown under the replies, usually a `Composer` */
  children?: React.ReactNode;
}

export type ThreadPanelFactory = Factory<{
  props: ThreadPanelProps;
  ref: HTMLDivElement;
  stylesNames: ThreadPanelStylesNames;
}>;

const defaultLabels = { title: 'Thread', close: 'Close thread' };

export const ThreadPanel = factory<ThreadPanelFactory>((_props) => {
  const props = useProps('ThreadPanel', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    parent,
    replies,
    users,
    currentUserId,
    subtitle,
    onClose,
    locale,
    actions,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    unreadAfterId,
    labels,
    children,
    ...others
  } = props;

  const getStyles = useStyles<ThreadPanelFactory>({
    name: 'ThreadPanel',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const {
    title: titleLabel,
    close: closeLabel,
    ...threadLabels
  } = { ...defaultLabels, ...labels };

  return (
    <Box
      ref={ref}
      role="complementary"
      aria-label={titleLabel}
      {...getStyles('root')}
      {...others}
    >
      <Box {...getStyles('header')}>
        <Box {...getStyles('heading')}>
          <Text fw={700} {...getStyles('title')}>
            {titleLabel}
          </Text>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate {...getStyles('subtitle')}>
              {subtitle}
            </Text>
          )}
        </Box>
        {onClose && <CloseButton aria-label={closeLabel} onClick={onClose} {...getStyles('close')} />}
      </Box>
      <TeamThread
        items={[parent, ...replies]}
        threadParentId={parent.id}
        users={users}
        currentUserId={currentUserId}
        locale={locale}
        actions={actions}
        onReact={onReact}
        onEdit={onEdit}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
        unreadAfterId={unreadAfterId}
        labels={threadLabels}
        unstyled={unstyled}
        {...getStyles('thread')}
      />
      {children && <Box {...getStyles('composer')}>{children}</Box>}
    </Box>
  );
});

ThreadPanel.displayName = 'ThreadPanel';
ThreadPanel.classes = classes;
```

`package/src/ThreadPanel/ThreadPanel.module.css`:

```css
/* Fills the height it is given: header, scrolling thread, composer */
.root {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--mantine-color-body);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-md);
  border-bottom: 1px solid var(--mantine-color-default-border);
}

.heading {
  flex: 1;
  min-width: 0;
}

.thread {
  flex: 1;
  min-height: 0;
}

.composer {
  padding: var(--mantine-spacing-sm);
}
```

In `package/src/index.ts` append:

```ts
export { ThreadPanel } from './ThreadPanel/ThreadPanel';
export type {
  ThreadPanelProps,
  ThreadPanelFactory,
  ThreadPanelStylesNames,
  ThreadPanelLabels,
} from './ThreadPanel/ThreadPanel';
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add ThreadPanel: a thread beside the channel with a composer slot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `Composer` modes

**Files:**
- Modify: `package/src/Composer/Composer.tsx`, `package/src/Composer/Composer.module.css`, `package/src/Composer/Composer.test.tsx`, `package/src/index.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ComposerMode { value: string; label: string; color?: MantineColor; placeholder?: string; note?: boolean }`
  - `ComposerProps` gains `modes?: ComposerMode[]`, `mode?: string` (controlled), `defaultMode?: string` (uncontrolled, the first mode by default), `onModeChange?(mode: string)`
  - `ComposerLabels` gains `modes: string` (accessible label of the switch, `'Message type'`)
  - `ComposerStylesNames` gains `'modes'` (the `SegmentedControl`)
  - The draft carries `mode` while a known mode is chosen; the root gets `data-mode="<value>"`, and `data-note` for a mode with `note: true`. Every existing Composer test keeps passing (no `modes`, no `mode` in the draft).

- [ ] **Step 1: Write the failing tests**

Append to `package/src/Composer/Composer.test.tsx`:

```tsx
describe('Composer modes', () => {
  const modes = [
    { value: 'reply', label: 'Reply' },
    {
      value: 'note',
      label: 'Note',
      color: 'yellow',
      note: true,
      placeholder: 'Only teammates see notes',
    },
  ];

  it('starts in the first mode and sends it with the draft', async () => {
    const onSend = jest.fn();
    const { container } = render(<Composer modes={modes} onSend={onSend} />);
    expect(screen.getByRole('radio', { name: 'Reply' })).toBeChecked();
    expect(container.querySelector('.mantine-Composer-root')).toHaveAttribute('data-mode', 'reply');
    expect(container.querySelector('.mantine-Composer-root')).not.toHaveAttribute('data-note');

    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'hi{Enter}');
    expect(onSend).toHaveBeenCalledWith({
      text: 'hi',
      format: 'text',
      attachments: [],
      mode: 'reply',
    });
  });

  it('switches to a note mode, with its placeholder and note styling', async () => {
    const onModeChange = jest.fn();
    const { container } = render(<Composer modes={modes} onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Note' }));
    expect(onModeChange).toHaveBeenCalledWith('note');

    const root = container.querySelector('.mantine-Composer-root');
    expect(root).toHaveAttribute('data-mode', 'note');
    expect(root).toHaveAttribute('data-note');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'placeholder',
      'Only teammates see notes'
    );
  });

  it('follows a controlled mode, and starts from defaultMode', async () => {
    const { rerender } = render(<Composer modes={modes} mode="note" />);
    await userEvent.click(screen.getByRole('radio', { name: 'Reply' }));
    expect(screen.getByRole('radio', { name: 'Note' })).toBeChecked();

    rerender(<Composer modes={modes} defaultMode="note" key="fresh" />);
    expect(screen.getByRole('radio', { name: 'Note' })).toBeChecked();
  });

  it('labels the switch, for translation', () => {
    render(<Composer modes={modes} labels={{ modes: 'Kind of message' }} />);
    expect(screen.getByRole('radiogroup', { name: 'Kind of message' })).toBeInTheDocument();
  });

  it('sends no mode while the mode is not one of the modes', async () => {
    const onSend = jest.fn();
    const { container } = render(<Composer modes={modes} mode="other" onSend={onSend} />);
    expect(container.querySelector('.mantine-Composer-root')).not.toHaveAttribute('data-mode');

    await userEvent.type(screen.getByRole('textbox'), 'hi{Enter}');
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text', attachments: [] });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/Composer`
Expected: FAIL in the five new tests, `Unable to find an accessible element with the role "radio"` (and `"radiogroup"`); the nine existing tests pass.

- [ ] **Step 3: Implement**

Replace `package/src/Composer/Composer.tsx` with:

```tsx
import {
  ActionIcon,
  Box,
  BoxProps,
  CloseButton,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  SegmentedControl,
  StylesApiProps,
  Text,
  Textarea,
  useProps,
  useStyles,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import React, { useEffect, useRef } from 'react';
import classes from './Composer.module.css';

export type ComposerStylesNames =
  | 'root'
  | 'modes'
  | 'reply'
  | 'replyText'
  | 'field'
  | 'input'
  | 'send';

/** The message being answered, shown above the text box */
export interface ComposerReply {
  /** `id` of the message being answered, sent as `replyToId` */
  id: string;
  authorName: string;
  body: string;
}

/** What the user sends */
export interface ComposerDraft {
  /** Trimmed text */
  text: string;
  format: 'text' | 'markdown';
  attachments: File[];

  /** Which mode was chosen, for example `'reply'` or `'note'` */
  mode?: string;

  /** `id` of the message being answered */
  replyToId?: string;
}

/** One choice of the mode switch, for example Reply or Internal note */
export interface ComposerMode {
  /** Sent as `draft.mode` */
  value: string;
  label: string;

  /** Colour of the switch while this mode is chosen */
  color?: MantineColor;

  /** Placeholder while this mode is chosen, instead of the `placeholder` prop */
  placeholder?: string;

  /** An internal note: the composer gets `data-note` and the note styling */
  note?: boolean;
}

export interface ComposerLabels {
  /** Accessible label of the send button */
  send: string;

  /** Before the author's name in the reply bar */
  replyingTo: string;

  /** Accessible label of the button that cancels the reply */
  cancelReply: string;

  /** Accessible label of the mode switch */
  modes: string;
}

export interface ComposerProps
  extends BoxProps, StylesApiProps<ComposerFactory>, ElementProps<'div', 'onChange'> {
  /** Text in the box, controlled */
  value?: string;

  /** Text in the box at first, uncontrolled */
  defaultValue?: string;

  /** Called when the text changes */
  onChange?: (value: string) => void;

  /** Called with the draft when the user sends it; the box then clears */
  onSend?: (draft: ComposerDraft) => void;

  /** How the text is written, copied into each draft, `'text'` by default */
  format?: 'text' | 'markdown';

  /** `'Message'` by default */
  placeholder?: string;

  /** The message being answered; shows a bar above the box and focuses it */
  replyTo?: ComposerReply | null;

  /** Called when the user cancels the reply, with the close button or Escape */
  onCancelReply?: () => void;

  /** Choices above the box, for example Reply and Internal note; the chosen one goes in the draft */
  modes?: ComposerMode[];

  /** `value` of the chosen mode, controlled */
  mode?: string;

  /** `value` of the mode chosen at first, uncontrolled; the first mode by default */
  defaultMode?: string;

  /** Called when the user picks a mode */
  onModeChange?: (mode: string) => void;

  /** Text for buttons and the reply bar, for translation */
  labels?: Partial<ComposerLabels>;

  disabled?: boolean;

  /** Most rows the box grows to before it scrolls, 6 by default */
  maxRows?: number;
}

export type ComposerFactory = Factory<{
  props: ComposerProps;
  ref: HTMLDivElement;
  stylesNames: ComposerStylesNames;
}>;

const defaultProps: Partial<ComposerProps> = {
  placeholder: 'Message',
  maxRows: 6,
  format: 'text',
};

const defaultLabels: ComposerLabels = {
  send: 'Send',
  replyingTo: 'Replying to',
  cancelReply: 'Cancel reply',
  modes: 'Message type',
};

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Composer = factory<ComposerFactory>((_props) => {
  const props = useProps('Composer', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    value,
    defaultValue,
    onChange,
    onSend,
    format,
    placeholder,
    replyTo,
    onCancelReply,
    modes,
    mode,
    defaultMode,
    onModeChange,
    labels,
    disabled,
    maxRows,
    mod,
    ...others
  } = props;

  const getStyles = useStyles<ComposerFactory>({
    name: 'Composer',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const [text, setText] = useUncontrolled({ value, defaultValue, finalValue: '', onChange });
  const [currentMode, setMode] = useUncontrolled<string>({
    value: mode,
    defaultValue: defaultMode,
    finalValue: modes?.[0]?.value ?? '',
    onChange: onModeChange,
  });
  const activeMode = modes?.find((item) => item.value === currentMode);
  const canSend = !disabled && text.trim().length > 0;
  const allLabels = { ...defaultLabels, ...labels };

  // Choosing a message to answer puts the cursor in the box
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (replyTo) {
      inputRef.current!.focus();
    }
  }, [replyTo]);

  const send = () => {
    if (canSend) {
      onSend?.({
        text: text.trim(),
        format: format!,
        attachments: [],
        ...(activeMode && { mode: activeMode.value }),
        ...(replyTo && { replyToId: replyTo.id }),
      });
      setText('');
    }
  };

  return (
    <Box
      ref={ref}
      mod={[{ mode: activeMode?.value, note: activeMode?.note }, mod]}
      {...getStyles('root')}
      {...others}
    >
      {modes && (
        <SegmentedControl
          size="xs"
          radius="xl"
          aria-label={allLabels.modes}
          data={modes.map((item) => ({ value: item.value, label: item.label }))}
          value={currentMode}
          onChange={setMode}
          color={activeMode?.color}
          disabled={disabled}
          {...getStyles('modes')}
        />
      )}
      {replyTo && (
        <Box {...getStyles('reply')}>
          <Box {...getStyles('replyText')}>
            <Text size="xs" c="dimmed">
              {allLabels.replyingTo}{' '}
              <Text component="span" inherit fw={600} c="var(--mantine-color-text)">
                {replyTo.authorName}
              </Text>
            </Text>
            <Text size="xs" truncate>
              {replyTo.body}
            </Text>
          </Box>
          <CloseButton size="sm" aria-label={allLabels.cancelReply} onClick={onCancelReply} />
        </Box>
      )}
      <Box {...getStyles('field')}>
        <Textarea
          ref={inputRef}
          autosize
          minRows={1}
          maxRows={maxRows}
          variant="unstyled"
          aria-label={placeholder}
          placeholder={activeMode?.placeholder ?? placeholder}
          disabled={disabled}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }

            if (event.key === 'Escape' && replyTo) {
              event.preventDefault();
              onCancelReply?.();
            }
          }}
          {...getStyles('input')}
        />
        <ActionIcon
          radius="xl"
          size="lg"
          aria-label={allLabels.send}
          disabled={!canSend}
          onClick={send}
          {...getStyles('send')}
        >
          <SendIcon />
        </ActionIcon>
      </Box>
    </Box>
  );
});

Composer.displayName = 'Composer';
Composer.classes = classes;
```

Replace `package/src/Composer/Composer.module.css` with:

```css
.root {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-xl);
  background-color: var(--mantine-color-body);

  &:focus-within {
    border-color: var(--mantine-primary-color-filled);
  }

  /* An internal note: a yellow tint over the body colour; not :where(), so it beats focus */
  &[data-note],
  &[data-note]:focus-within {
    border-color: var(--mantine-color-yellow-filled);
    background-image: linear-gradient(
      var(--mantine-color-yellow-light),
      var(--mantine-color-yellow-light)
    );
  }
}

/* Mode switch, for example Reply and Internal note */
.modes {
  align-self: flex-start;
  margin: 8px 10px 0;
}

/* "Replying to Maya" and the message, above the text box */
.reply {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  margin: 6px 6px 0;
  padding: 4px 4px 4px 10px;
  border-inline-start: 3px solid var(--mantine-primary-color-filled);
  border-radius: var(--mantine-radius-md);

  @mixin light {
    background-color: var(--mantine-color-gray-0);
  }

  @mixin dark {
    background-color: var(--mantine-color-dark-6);
  }
}

.replyText {
  flex: 1;
  min-width: 0;
}

.field {
  display: flex;
  align-items: flex-end;
  gap: var(--mantine-spacing-xs);
  padding: 4px 4px 4px var(--mantine-spacing-md);
}

.input {
  flex: 1;
  min-width: 0;
}

.send {
  flex-shrink: 0;
}
```

In `package/src/index.ts`, in the `export type { ... } from './Composer/Composer';` list, add `ComposerMode,` after `ComposerLabels,`.

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%, including the nine Composer tests that were there before.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Composer modes with a note style

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `Inbox` search and sections

**Files:**
- Modify: `package/src/Inbox/Inbox.tsx`, `package/src/Inbox/Inbox.module.css`, `package/src/Inbox/Inbox.test.tsx`, `package/src/index.ts`

**Interfaces:**
- Consumes: `HashIcon`, `SearchIcon` (Task 1); `Conversation.kind`, `Conversation.pinned`.
- Produces:
  - `InboxSection { id: string; label: ReactNode; match(conversation): boolean }`
  - `InboxLabels { search: string; noResults: string; pinned: string; channels: string; direct: string }`, defaults `'Search'`, `'No matches'`, `'Pinned'`, `'Channels'`, `'Direct messages'`
  - `InboxProps` gains `withSearch?: boolean`, `search?: string`, `defaultSearch?: string`, `onSearchChange?(search: string)`, `sections?: boolean | InboxSection[]`, `labels?: Partial<InboxLabels>`
  - `InboxStylesNames` gains `'search' | 'section' | 'sectionLabel'`
  - Each section is `role="group"` labelled by its heading; empty sections are hidden; channel rows get `data-channel` and a `#` icon in the avatar. Every existing Inbox test keeps passing.

- [ ] **Step 1: Write the failing tests**

In `package/src/Inbox/Inbox.test.tsx` add these imports below the existing ones:

```tsx
import { within } from '@testing-library/react';
```

and append:

```tsx
describe('Inbox search and sections', () => {
  const team: Conversation[] = [
    { id: 'general', title: 'general', kind: 'channel' },
    { id: 'launch', title: 'launch', kind: 'channel', pinned: true },
    { id: 'maya', title: 'Maya Lindqvist', kind: 'direct' },
    { id: 'crew', title: 'Priya, Sam', kind: 'group' },
    { id: 'old', title: 'Old chat' },
  ];

  it('filters by title with the search box, uncontrolled', async () => {
    const onSearchChange = jest.fn();
    render(<Inbox conversations={team} withSearch onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), ' MAYA ');
    expect(onSearchChange).toHaveBeenLastCalledWith(' MAYA ');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Maya/ })).toBeInTheDocument();
  });

  it('filters with a controlled search and says when nothing matches', () => {
    render(<Inbox conversations={team} search="zzz" labels={{ noResults: 'Nothing here' }} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('groups into Pinned, Channels and Direct messages', () => {
    render(<Inbox conversations={team} sections />);
    const pinned = within(screen.getByRole('group', { name: 'Pinned' })).getAllByRole('button');
    const channels = within(screen.getByRole('group', { name: 'Channels' })).getAllByRole('button');
    const direct = within(screen.getByRole('group', { name: 'Direct messages' })).getAllByRole(
      'button'
    );
    expect(pinned).toHaveLength(1);
    expect(pinned[0]).toHaveAccessibleName(/launch/);
    expect(channels).toHaveLength(1);
    expect(channels[0]).toHaveAccessibleName(/general/);
    expect(direct).toHaveLength(3);
  });

  it('hides empty sections and takes custom sections and labels', () => {
    const { rerender } = render(
      <Inbox
        conversations={team}
        sections={[{ id: 'mine', label: 'Mine', match: (c) => c.id === 'maya' }]}
      />
    );
    expect(within(screen.getByRole('group', { name: 'Mine' })).getAllByRole('button')).toHaveLength(
      1
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);

    rerender(
      <Inbox
        conversations={team.filter((c) => c.kind === 'channel' && !c.pinned)}
        sections
        labels={{ channels: 'Rooms' }}
      />
    );
    expect(screen.queryByRole('group', { name: 'Pinned' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Rooms' })).toBeInTheDocument();
  });

  it('marks channels with a # icon', () => {
    render(<Inbox conversations={team} />);
    const general = screen.getByRole('button', { name: /general/ });
    expect(general).toHaveAttribute('data-channel');
    expect(general.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maya/ })).not.toHaveAttribute('data-channel');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/Inbox`
Expected: FAIL in the five new tests (no search textbox, no `group` roles, no `data-channel`); the five existing tests pass.

- [ ] **Step 3: Implement**

Replace `package/src/Inbox/Inbox.tsx` with:

```tsx
import {
  Avatar,
  Badge,
  Box,
  BoxProps,
  ElementProps,
  EmptyState,
  factory,
  Factory,
  StylesApiProps,
  Text,
  TextInput,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import { useId, useUncontrolled } from '@mantine/hooks';
import React from 'react';
import { HashIcon, SearchIcon } from '../icons';
import type { Conversation } from '../types';
import { formatShort } from '../utils/format';
import { getPreview } from '../utils/preview';
import classes from './Inbox.module.css';

export type InboxStylesNames =
  | 'root'
  | 'search'
  | 'section'
  | 'sectionLabel'
  | 'item'
  | 'avatar'
  | 'body'
  | 'title'
  | 'time'
  | 'preview'
  | 'unread'
  | 'empty';

/** A heading and the conversations under it */
export interface InboxSection {
  id: string;
  label: React.ReactNode;

  /** Whether a conversation belongs here; each one goes in the first section that matches */
  match: (conversation: Conversation) => boolean;
}

export interface InboxLabels {
  /** Placeholder and accessible label of the search box */
  search: string;

  /** Shown when the search matches nothing */
  noResults: string;

  /** Heading of the built-in section for `pinned` conversations */
  pinned: string;

  /** Heading of the built-in section for `kind: 'channel'` */
  channels: string;

  /** Heading of the built-in section for everything else */
  direct: string;
}

export interface InboxProps
  extends BoxProps, StylesApiProps<InboxFactory>, ElementProps<'div', 'onChange' | 'defaultValue'> {
  /** Conversations in the order to show them */
  conversations: Conversation[];

  /** `id` of the open conversation, controlled */
  value?: string | null;

  /** `id` of the open conversation at first, uncontrolled */
  defaultValue?: string | null;

  /** Called with the `id` of the conversation the user opens */
  onChange?: (id: string) => void;

  /** Locale for times, the browser's by default */
  locale?: string;

  /** Shown when there are no conversations, `'No conversations'` by default */
  emptyLabel?: React.ReactNode;

  /** Show a search box above the list */
  withSearch?: boolean;

  /** Search text, controlled; filters by title, with or without the search box */
  search?: string;

  /** Search text at first, uncontrolled */
  defaultSearch?: string;

  /** Called when the search text changes */
  onSearchChange?: (search: string) => void;

  /**
   * `true` for Pinned, Channels and Direct messages (from `pinned` and `kind`), or your own
   * sections; conversations that no section matches are left out
   */
  sections?: boolean | InboxSection[];

  /** Text, for translation */
  labels?: Partial<InboxLabels>;
}

export type InboxFactory = Factory<{
  props: InboxProps;
  ref: HTMLDivElement;
  stylesNames: InboxStylesNames;
}>;

const defaultProps: Partial<InboxProps> = {
  emptyLabel: 'No conversations',
};

const defaultLabels: InboxLabels = {
  search: 'Search',
  noResults: 'No matches',
  pinned: 'Pinned',
  channels: 'Channels',
  direct: 'Direct messages',
};

// Pinned first, then channels, then everything else
const builtInSections = (labels: InboxLabels): InboxSection[] => [
  { id: 'pinned', label: labels.pinned, match: (conversation) => !!conversation.pinned },
  {
    id: 'channels',
    label: labels.channels,
    match: (conversation) => conversation.kind === 'channel',
  },
  { id: 'direct', label: labels.direct, match: () => true },
];

export const Inbox = factory<InboxFactory>((_props) => {
  const props = useProps('Inbox', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    conversations,
    value,
    defaultValue,
    onChange,
    locale,
    emptyLabel,
    withSearch,
    search,
    defaultSearch,
    onSearchChange,
    sections,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<InboxFactory>({
    name: 'Inbox',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const [selected, setSelected] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: null,
    onChange: (id) => id !== null && onChange?.(id),
  });
  const [query, setQuery] = useUncontrolled({
    value: search,
    defaultValue: defaultSearch,
    finalValue: '',
    onChange: onSearchChange,
  });
  const sectionId = useId();
  const allLabels = { ...defaultLabels, ...labels };
  const needle = query.trim().toLocaleLowerCase();
  const shown = conversations.filter((conversation) =>
    conversation.title.toLocaleLowerCase().includes(needle)
  );
  const groups = sections === true ? builtInSections(allLabels) : sections || null;

  const renderConversation = (conversation: Conversation) => {
    const unread = conversation.unreadCount ?? 0;
    const active = conversation.id === selected;
    const channel = conversation.kind === 'channel';

    return (
      <UnstyledButton
        key={conversation.id}
        aria-current={active ? 'true' : undefined}
        mod={{ active, unread: unread > 0, muted: conversation.muted, channel }}
        onClick={() => setSelected(conversation.id)}
        {...getStyles('item')}
      >
        <Avatar src={conversation.avatar} name={conversation.title} {...getStyles('avatar')}>
          {channel && <HashIcon />}
        </Avatar>
        <Box {...getStyles('body')}>
          <Text component="span" size="sm" truncate {...getStyles('title')}>
            {conversation.title}
          </Text>
          {conversation.lastMessage && (
            <Text component="span" size="xs" c="dimmed" {...getStyles('time')}>
              {formatShort(conversation.lastMessage.createdAt, locale)}
            </Text>
          )}
          <Text component="span" size="sm" truncate {...getStyles('preview')}>
            {conversation.lastMessage && getPreview(conversation.lastMessage)}
          </Text>
          {unread > 0 && (
            <Badge size="sm" circle={unread < 10} {...getStyles('unread')}>
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Box>
      </UnstyledButton>
    );
  };

  const renderSections = (list: InboxSection[]) =>
    list.map((section) => {
      const members = shown.filter(
        (conversation) => list.find((candidate) => candidate.match(conversation)) === section
      );

      if (members.length === 0) {
        return null;
      }

      const labelId = `${sectionId}-${section.id}`;

      return (
        <Box key={section.id} role="group" aria-labelledby={labelId} {...getStyles('section')}>
          <Text id={labelId} size="xs" fw={600} c="dimmed" {...getStyles('sectionLabel')}>
            {section.label}
          </Text>
          {members.map(renderConversation)}
        </Box>
      );
    });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {withSearch && (
        <TextInput
          size="xs"
          radius="md"
          leftSection={<SearchIcon size={14} />}
          placeholder={allLabels.search}
          aria-label={allLabels.search}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          {...getStyles('search')}
        />
      )}
      {shown.length === 0 && (
        <EmptyState
          size="sm"
          title={conversations.length === 0 ? emptyLabel : allLabels.noResults}
          {...getStyles('empty')}
        />
      )}
      {groups ? renderSections(groups) : shown.map(renderConversation)}
    </Box>
  );
});

Inbox.displayName = 'Inbox';
Inbox.classes = classes;
```

In `package/src/Inbox/Inbox.module.css` add after the `.root` rule:

```css
.search {
  margin-bottom: var(--mantine-spacing-xs);
}

/* A heading and its conversations */
.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section + .section {
  margin-top: var(--mantine-spacing-sm);
}

.sectionLabel {
  padding: 4px var(--mantine-spacing-sm);
}
```

In `package/src/index.ts` replace `export type { InboxProps, InboxFactory, InboxStylesNames } from './Inbox/Inbox';` with:

```ts
export type {
  InboxProps,
  InboxFactory,
  InboxStylesNames,
  InboxSection,
  InboxLabels,
} from './Inbox/Inbox';
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%, including the five Inbox tests that were there before.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add search and sections to Inbox, and a # on channel rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Team sample data and the Team story

**Files:**
- Modify: `package/src/sample-data.ts`, `package/src/Messages.story.tsx`

**Interfaces:**
- Consumes: `TeamThread`, `TeamThreadItem`, `ThreadPanel`, `Composer`, `ComposerMode`, `ComposerDraft`, `Inbox`, `sampleUsers`.
- Produces: `sampleChannels: Conversation[]`, `sampleTeamItems: (ChatMessage | SystemEvent)[]` (excluded from coverage like the rest of `sample-data.ts`); story `Team` (`?path=/story/messages--team`).

- [ ] **Step 1: Sample data**

In `package/src/sample-data.ts` change the first line to:

```ts
import type { Conversation, ChatMessage, MessagesUser, SystemEvent } from './types';
```

and append:

```ts
export const sampleChannels: Conversation[] = [
  {
    id: 'launch',
    title: 'launch',
    kind: 'channel',
    pinned: true,
    unreadCount: 2,
    lastMessage: { authorId: 'priya', body: 'Screenshots are up 🎉', createdAt: minutesAgo(12) },
  },
  {
    id: 'general',
    title: 'general',
    kind: 'channel',
    lastMessage: { authorId: 'sam', body: 'Lunch is on the roof today', createdAt: minutesAgo(80) },
  },
  {
    id: 'design',
    title: 'design',
    kind: 'channel',
    muted: true,
    unreadCount: 5,
    lastMessage: { authorId: 'sam', body: 'New icons are in the file', createdAt: at(1, 16, 40) },
  },
  {
    id: 'random',
    title: 'random',
    kind: 'channel',
    lastMessage: { authorId: 'theo', body: 'Who borrowed the HDMI adapter?', createdAt: at(2, 11, 5) },
  },
  {
    id: 'dm-maya',
    title: 'Maya Lindqvist',
    kind: 'direct',
    unreadCount: 1,
    lastMessage: { authorId: 'maya', body: 'Got a minute after standup?', createdAt: minutesAgo(25) },
  },
  {
    id: 'dm-theo',
    title: 'Theo Okafor',
    kind: 'direct',
    lastMessage: { authorId: 'me', body: 'Thanks!', createdAt: at(1, 18, 2) },
  },
  {
    id: 'dm-crew',
    title: 'Priya Raman, Sam Whitaker',
    kind: 'group',
    lastMessage: { authorId: 'priya', body: 'Booked the room', createdAt: at(3, 9, 30) },
  },
];

/** #launch: an event, a thread, a follow-up, a file, an edit, an internal note and reactions */
export const sampleTeamItems: (ChatMessage | SystemEvent)[] = [
  {
    id: 'team-e1',
    kind: 'event',
    authorId: 'priya',
    text: 'Priya Raman joined #launch',
    createdAt: at(1, 9, 0),
  },
  {
    id: 'team-m1',
    authorId: 'maya',
    body: 'Launch checklist is in the pinned doc. Can everyone claim their items by end of day?',
    createdAt: at(1, 9, 30),
    reactions: [{ emoji: '👀', userIds: ['theo', 'priya'] }],
    thread: { count: 3, lastReplyAt: minutesAgo(120), participantIds: ['theo', 'priya', 'me'] },
  },
  {
    id: 'team-r1',
    authorId: 'theo',
    threadId: 'team-m1',
    body: "I'll take the release notes and the changelog.",
    createdAt: at(1, 9, 41),
  },
  {
    id: 'team-r2',
    authorId: 'priya',
    threadId: 'team-m1',
    body: 'Docs screenshots are mine.',
    createdAt: at(1, 10, 2),
  },
  {
    id: 'team-r3',
    authorId: 'me',
    threadId: 'team-m1',
    body: 'Taking the pricing page copy.',
    createdAt: minutesAgo(120),
  },
  {
    id: 'team-m2',
    authorId: 'maya',
    body: 'Also: code freeze is Thursday at noon.',
    createdAt: at(1, 9, 31),
  },
  {
    id: 'team-m3',
    authorId: 'theo',
    body: 'Staging build 412 is green. Smoke tests pass on all three browsers.',
    createdAt: minutesAgo(95),
    attachments: [
      {
        id: 'team-f1',
        name: 'smoke-report.pdf',
        url: '#',
        mimeType: 'application/pdf',
        size: 92160,
      },
    ],
  },
  {
    id: 'team-m4',
    authorId: 'theo',
    body: 'Only flaky one was the upload test; a rerun passed.',
    createdAt: minutesAgo(94),
    editedAt: minutesAgo(90),
  },
  {
    id: 'team-m5',
    authorId: 'sam',
    visibility: 'internal',
    body: 'Heads up: the payment provider rotates keys tonight. No deploys between 22:00 and 23:00.',
    createdAt: minutesAgo(40),
  },
  {
    id: 'team-m6',
    authorId: 'priya',
    body: 'Screenshots are up 🎉',
    createdAt: minutesAgo(12),
    reactions: [{ emoji: '🎉', userIds: ['maya', 'me'] }],
  },
];
```

- [ ] **Step 2: The Team story**

In `package/src/Messages.story.tsx` replace the import block (the first seven lines) with:

```tsx
import { Box, Paper, ScrollArea, Text } from '@mantine/core';
import React, { useRef, useState } from 'react';
import { Composer, type ComposerDraft, type ComposerMode } from './Composer/Composer';
import { Inbox } from './Inbox/Inbox';
import {
  sampleChannels,
  sampleConversations,
  sampleMessages,
  sampleTeamItems,
  sampleUsers,
} from './sample-data';
import { ChatThread } from './ChatThread/ChatThread';
import { TeamThread, type TeamThreadItem } from './TeamThread/TeamThread';
import { ThreadPanel } from './ThreadPanel/ThreadPanel';
import type { ChatMessage, Conversation } from './types';
```

and append:

```tsx
const teamModes: ComposerMode[] = [
  { value: 'message', label: 'Message' },
  {
    value: 'note',
    label: 'Internal note',
    color: 'yellow',
    note: true,
    placeholder: 'Only teammates see internal notes',
  },
];

const isMessage = (item: TeamThreadItem): item is ChatMessage => !('kind' in item);
const nameOf = (conversation: Conversation) =>
  conversation.kind === 'channel' ? `#${conversation.title}` : conversation.title;

// Every channel but #launch starts empty, with a line saying so
const firstItems = (conversation: Conversation): TeamThreadItem[] =>
  conversation.id === 'launch'
    ? sampleTeamItems
    : [
        {
          id: `start-${conversation.id}`,
          kind: 'event',
          authorId: 'me',
          text: `This is the very beginning of ${nameOf(conversation)}`,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ];

/** Slack-style: channels with sections and search, a channel, and a thread beside it */
export function Team() {
  const [channelId, setChannelId] = useState('launch');
  const [openId, setOpenId] = useState<string | null>(null);
  const [itemsByChannel, setItemsByChannel] = useState<Record<string, TeamThreadItem[]>>(() =>
    Object.fromEntries(sampleChannels.map((conversation) => [conversation.id, firstItems(conversation)]))
  );
  const count = useRef(0);
  const channel = sampleChannels.find((conversation) => conversation.id === channelId)!;
  const items = itemsByChannel[channelId];
  const messages = items.filter(isMessage);
  const channelItems = items.filter((item) => !isMessage(item) || !item.threadId);
  const parent = messages.find((message) => message.id === openId);
  const replies = messages.filter((message) => message.threadId === openId);

  const update = (change: (current: TeamThreadItem[]) => TeamThreadItem[]) =>
    setItemsByChannel((current) => ({ ...current, [channelId]: change(current[channelId]) }));

  const toggle = (id: string, emoji: string) =>
    update((current) =>
      current.map((item) => {
        if (!isMessage(item) || item.id !== id) {
          return item;
        }

        const reactions = item.reactions ?? [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        const next = existing
          ? reactions.map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    userIds: reaction.userIds.includes('me')
                      ? reaction.userIds.filter((userId) => userId !== 'me')
                      : [...reaction.userIds, 'me'],
                  }
                : reaction
            )
          : [...reactions, { emoji, userIds: ['me'] }];

        return { ...item, reactions: next };
      })
    );

  // A message in the channel, or a reply that also bumps its parent's summary
  const post = (draft: ComposerDraft, threadId?: string) => {
    count.current += 1;
    const message: ChatMessage = {
      id: `team-new-${count.current}`,
      authorId: 'me',
      body: draft.text,
      createdAt: new Date(),
      threadId,
      visibility: draft.mode === 'note' ? 'internal' : 'public',
    };

    update((current) => [
      ...current.map((item) =>
        isMessage(item) && item.id === threadId
          ? {
              ...item,
              thread: {
                count: (item.thread?.count ?? 0) + 1,
                lastReplyAt: message.createdAt,
                participantIds: Array.from(new Set([...(item.thread?.participantIds ?? []), 'me'])),
              },
            }
          : item
      ),
      message,
    ]);
  };

  const border = '1px solid var(--mantine-color-default-border)';

  return (
    <Box p="xl">
      <Paper withBorder radius="lg" h={640} style={{ display: 'flex', overflow: 'hidden' }}>
        <Box w={260} style={{ display: 'flex', flexDirection: 'column', borderRight: border }}>
          <Text fw={800} px="md" py="sm" style={{ borderBottom: border }}>
            Acme
          </Text>
          <ScrollArea style={{ flex: 1 }}>
            <Inbox
              conversations={sampleChannels}
              value={channelId}
              onChange={(id) => {
                setChannelId(id);
                setOpenId(null);
              }}
              withSearch
              sections
            />
          </ScrollArea>
        </Box>
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box px="md" py="sm" style={{ borderBottom: border }}>
            <Text fw={700}>{nameOf(channel)}</Text>
            <Text size="xs" c="dimmed">
              {channel.kind === 'channel' ? 'Ship it Thursday' : 'Direct message'}
            </Text>
          </Box>
          <TeamThread
            items={channelItems}
            users={sampleUsers}
            currentUserId="me"
            unreadAfterId={channelId === 'launch' ? 'team-m4' : null}
            selectedId={openId}
            onOpenThread={(message) => setOpenId(message.id)}
            onReact={(message) => toggle(message.id, '👀')}
            onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
            onEdit={() => {}}
            style={{ flex: 1 }}
          />
          <Box p="sm">
            <Composer
              key={channelId}
              modes={teamModes}
              placeholder={`Message ${nameOf(channel)}`}
              onSend={(draft) => post(draft)}
            />
          </Box>
        </Box>
        {parent && (
          <ThreadPanel
            w={360}
            parent={parent}
            replies={replies}
            users={sampleUsers}
            currentUserId="me"
            subtitle={nameOf(channel)}
            onClose={() => setOpenId(null)}
            onReact={(message) => toggle(message.id, '👀')}
            onToggleReaction={(message, emoji) => toggle(message.id, emoji)}
            style={{ borderLeft: border }}
          >
            <Composer key={parent.id} placeholder="Reply…" onSend={(draft) => post(draft, parent.id)} />
          </ThreadPanel>
        )}
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 3: Run checks**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100% (stories and sample data are outside coverage).

Run: `npm run storybook` (in the background) and open `http://localhost:8281/?path=/story/messages--team`; it renders without console errors. The full look is checked in Task 8.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add a Slack-style Team story with channels, a thread panel and note mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Docs, gate and the browser check

**Files:**
- Modify: `scripts/docgen.ts`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `docs/docs.mdx`, `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: no code API.

- [ ] **Step 1: Docgen and the docs page**

In `scripts/docgen.ts` add to `componentsPaths`: `getComponentPath('Message/Message.tsx')`, `getComponentPath('TeamThread/TeamThread.tsx')`, `getComponentPath('ThreadPanel/ThreadPanel.tsx')`.

In `docs/pages/index.tsx` add `'TeamThread', 'ThreadPanel', 'Message'` after `'Composer'` in both `componentsProps` and `componentsStyles`.

- [ ] **Step 2: Styles API data**

In `docs/styles-api/index.ts` add `MessageFactory`, `TeamThreadFactory` and `ThreadPanelFactory` to the type import from `'mantine-messages'`.

Replace `InboxStylesApi` with:

```ts
export const InboxStylesApi: StylesApiData<InboxFactory> = {
  selectors: {
    root: 'Root element',
    search: 'Search box, with `withSearch`',
    section: 'One section: a heading and its conversations',
    sectionLabel: 'Heading of a section',
    item: 'Button for one conversation',
    avatar: 'Conversation avatar; a # for channels',
    body: 'Grid holding the title, time, preview and unread count',
    title: 'Conversation title',
    time: 'Time of the last message',
    preview: 'Text of the last message',
    unread: 'Unread count badge',
    empty: 'Shown when there are no conversations or the search matches none',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-active', selector: 'item', condition: 'The conversation is open' },
    { modifier: 'data-unread', selector: 'item', condition: '`unreadCount` is above 0' },
    { modifier: 'data-muted', selector: 'item', condition: '`muted` is set on the conversation' },
    { modifier: 'data-channel', selector: 'item', condition: '`kind` is `channel`' },
  ],
};
```

Replace `ComposerStylesApi` with:

```ts
export const ComposerStylesApi: StylesApiData<ComposerFactory> = {
  selectors: {
    root: 'Root element',
    modes: 'SegmentedControl that picks the mode, with `modes`',
    reply: 'Bar above the text box while replying, with a cancel button',
    replyText: 'Who and what the reply answers',
    field: 'Row with the text box and the send button',
    input: 'Textarea that grows with its text',
    send: 'Send button',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-mode', selector: 'root', condition: '`value` of the chosen mode' },
    { modifier: 'data-note', selector: 'root', condition: 'The chosen mode has `note: true`' },
  ],
};
```

Add before `STYLES_API_DATA`:

```ts
export const MessageStylesApi: StylesApiData<MessageFactory> = {
  selectors: {
    root: 'Root element: an avatar column and a content column',
    avatar: '`Message.Avatar`',
    body: '`Message.Body`, the content column',
    meta: '`Message.Meta`: name and time, or a time in the avatar column shown on hover',
  },
  vars: {},
  modifiers: [{ modifier: 'data-compact', selector: 'root', condition: '`compact` is set' }],
};

export const TeamThreadStylesApi: StylesApiData<TeamThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of rows, a live log',
    divider: 'Date divider',
    unread: '"New messages" line',
    loader: 'Loader at the top while older messages load',
    item: 'Wrapper of one row, scrolled to by jumps',
    row: 'One message, a `Message`',
    avatar: 'Avatar on the first message of a group',
    gutterTime: 'Time beside a follow-up message, shown on hover',
    body: 'Name, text, files, reactions and thread summary',
    meta: 'Name and time on the first message of a group',
    author: 'Name of the author',
    time: 'Time of the message',
    noteLabel: '"Internal note" above an internal note',
    text: 'Text of the message',
    edited: '"(edited)" after an edited message',
    actions: 'MessageActions toolbar, shown on hover and focus',
    attachments: 'Attachments under the text',
    reactions: 'Reactions under the text',
    threadSummary: '"12 replies" with who answered and when; opens the thread',
    repliesDivider: 'Divider with the reply count after the parent, with `threadParentId`',
    event: 'A system event, such as "Maya joined"',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-compact', selector: 'row', condition: 'A follow-up message of a group' },
    { modifier: 'data-internal', selector: 'row', condition: '`visibility` is `internal`' },
    { modifier: 'data-selected', selector: 'row', condition: 'The message is `selectedId`' },
    {
      modifier: 'data-highlighted',
      selector: 'row',
      condition: 'For 1.6 seconds after a jump to the message',
    },
  ],
};

export const ThreadPanelStylesApi: StylesApiData<ThreadPanelFactory> = {
  selectors: {
    root: 'Root element, a complementary region named by the title',
    header: 'Title, subtitle and close button',
    heading: 'Title and subtitle',
    title: 'Title, "Thread" by default',
    subtitle: 'Subtitle, for example the channel',
    close: 'Close button, with `onClose`',
    thread: 'The TeamThread: parent, replies divider and replies',
    composer: 'Wrapper of `children`, usually a Composer',
  },
  vars: {},
};
```

and add to `STYLES_API_DATA`:

```ts
  Message: MessageStylesApi,
  TeamThread: TeamThreadStylesApi,
  ThreadPanel: ThreadPanelStylesApi,
```

- [ ] **Step 3: docs.mdx, README and CHANGELOG**

In `docs/docs.mdx` add before `## Inbox`:

````mdx
## Team chat

`TeamThread` shows Slack-style rows: avatar, name and time on the first message of a group, and
compact follow-ups whose time shows on hover. It takes `ChatMessage` and `SystemEvent` items;
events such as "Priya joined #launch" are centred lines that break groups. A message with `thread`
shows "12 replies" with the people who answered and calls `onOpenThread`; `editedAt` adds
"(edited)", and `visibility: 'internal'` marks an internal note. On hover each message shows React,
Reply in thread, and a menu with Edit (your own messages) and Copy.

Pass channel messages only; thread replies (messages with `threadId`) go to `ThreadPanel`, which
shows the parent, a reply count and the replies, with your `Composer` as its children.

```tsx
const channelItems = items.filter((item) => 'kind' in item || !item.threadId);
const replies = messages.filter((message) => message.threadId === open?.id);

<TeamThread
  items={channelItems}
  users={users}
  currentUserId="me"
  selectedId={open?.id}
  onOpenThread={setOpen}
/>
{open && (
  <ThreadPanel
    parent={open}
    replies={replies}
    users={users}
    currentUserId="me"
    subtitle="#launch"
    onClose={() => setOpen(null)}
  >
    <Composer onSend={(draft) => reply(open.id, draft)} />
  </ThreadPanel>
)}
```

## Message parts

`Message` is the row `TeamThread` draws, for your own layouts: an avatar column and a content
column. Its parts share one Styles API.

```tsx
<Message compact={!groupStart}>
  {groupStart ? <Message.Avatar name={author.name} src={author.avatar} /> : <Message.Meta>9:41</Message.Meta>}
  <Message.Body>
    {groupStart && <Message.Meta>{author.name} · 9:41</Message.Meta>}
    {note.text}
  </Message.Body>
</Message>
```
````

Append to the `## Inbox` section:

```mdx
`withSearch` adds a search box that filters by title (`search`, `defaultSearch` and
`onSearchChange` control it). `sections` groups the list: `true` gives Pinned, Channels and Direct
messages from `pinned` and `kind`, or pass `{ id, label, match }` objects; each conversation goes in
the first section that matches. Channels show a `#`.
```

Append to the `## Composer` section:

````mdx
`modes` adds a switch above the box, for example Reply and Internal note; the chosen `value` goes in
`draft.mode`. A mode with `note: true` tints the composer yellow, and its `placeholder` replaces the
usual one.

```tsx
<Composer
  modes={[
    { value: 'reply', label: 'Reply' },
    { value: 'note', label: 'Internal note', color: 'yellow', note: true, placeholder: 'Only teammates see notes' },
  ]}
  onSend={(draft) => send({ body: draft.text, visibility: draft.mode === 'note' ? 'internal' : 'public' })}
/>
```
````

In `README.md` add rows to the components table after the `Composer` row:

```markdown
| `TeamThread` | Slack-style rows: compact follow-ups, event lines, internal notes, "12 replies" thread summaries, reactions and files |
| `ThreadPanel` | A thread beside the channel: the parent, a reply count, the replies and your composer |
| `Message` | The parts of a row (`Message.Avatar`, `Message.Body`, `Message.Meta`) for your own layouts |
```

In `CHANGELOG.md` under `## Unreleased`, `### Added`, append:

```markdown
- `TeamThread`: Slack-style rows with compact follow-ups, event rows, internal notes, "(edited)",
  thread summaries that call `onOpenThread`, and a hover toolbar
- `ThreadPanel`: a thread beside the channel, with a slot for a `Composer`
- `Message`, `Message.Avatar`, `Message.Body`, `Message.Meta`: building blocks for message rows
- `Composer`: `modes` with `draft.mode`, and note styling for a mode with `note: true`
- `Inbox`: a search box (`withSearch`), sections (`sections`), and a `#` on channels
```

- [ ] **Step 4: Gate**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test`
Expected: exit 0, 100%. Check `docs/docgen.json` has `Message`, `TeamThread` and `ThreadPanel` keys. If docgen skipped `Message` (the compound statics can confuse it), remove `'Message'` from `componentsProps` only and say so in the commit message; keep it in `componentsStyles`.

- [ ] **Step 5: Browser check (Steve watches)**

Open `http://localhost:8281/?path=/story/messages--team`:
- Sidebar: "Acme", a Search box, then Pinned (`# launch`), Channels (`# general`, `# design` muted with its badge greyed, `# random`) and Direct messages (Maya, Theo, Priya and Sam). Typing `the` leaves Theo; clearing brings everything back.
- Channel: a centred dimmed "Priya Raman joined #launch"; Maya's checklist message with avatar, bold name and time; "Also: code freeze…" under it with no avatar or name, and its time appears in the avatar column on hover.
- Under the checklist: 👀 2, then three small avatars, "3 replies" and "Last reply 2 hours ago".
- Theo's smoke-report.pdf chip; "(edited)" after "Only flaky one…"; the red "New messages" line after it; Sam's message on a yellow tint with a yellow left edge and "Internal note".
- Hovering a row shows a floating toolbar at its top right: React and Reply in thread; on your own messages a More menu with Edit and Copy. React adds 👀; clicking a reaction chip toggles it.
- Clicking "3 replies" opens the panel on the right: "Thread", "#launch", a close button, the checklist message, a "3 replies" divider, the three replies, a composer. The checklist row in the channel turns primary-light.
- Replying in the panel adds the reply at the bottom and the channel summary says "4 replies", "Last reply now".
- Composer: switching to "Internal note" turns it yellow with "Only teammates see internal notes"; sending adds a yellow note row. The close button hides the panel; switching channels shows "This is the very beginning of #general".

Open `?path=/story/messages--team&globals=theme:dark` and confirm hover rows, the note tint, the toolbar and the selected row read well in dark mode. Open `?path=/story/messages--messenger` and confirm ChatThread looks as before.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Document TeamThread, ThreadPanel, Message parts, Composer modes and Inbox sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After this phase

Merge `feat/team-chat` the same way as phase 1 (full suite on the result), push, and open a PR so CI runs. Phase 3 (markdown and LLM) runs in parallel and touches none of these files except `index.ts`, `index.test.ts`, `docs/*` and `CHANGELOG.md`; merge those by hand. Open follow-ups for phase 4: an external jump-to on `MessageList` (a ref method or a prop) so a work-queue timeline can open at an item.

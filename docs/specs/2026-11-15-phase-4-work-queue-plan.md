# Phase 4: Work Queue Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the work-queue example app (triage table, one mixed timeline per ticket, Reply / Internal note composer, assign, status, priority, snooze, bulk assign / close / tag) in the docs and in Storybook, plus one new package API it needs: `controlRef` on `MessageList` (forwarded by `ChatThread`, `TeamThread` and `AssistantThread`), so code outside a list can jump to a message and flash it.

**Architecture:** The package gains only `controlRef?: React.Ref<MessageListControl>` (`useImperativeHandle` over the `jumpTo` that `useMessageList` already has). The example lives once, in `docs/demos/WorkQueue/`, as plain React components over Mantine: a pure `queueReducer` and filter / sort helpers in `queue.ts`; `TriageTable` on Mantine `Table`; `TicketTimeline` on `MessageList` with a `renderItem` that draws `EmailItem` as a card, `ChatMessage` (public or `visibility: 'internal'`) with `Message` parts, and `SystemEvent` as a line; `EmailModal` (Mantine `Modal`) whose `EmailBody` is the phase 5 seam; `TicketSidebar` with the per-ticket actions and an Activity list that jumps through `controlRef`. The example imports `'mantine-messages'` by name like an app: Jest maps that name to `package/src/index.ts`, Storybook aliases it to the same file, the two `tsc` runs and Next read the built `package/dist`.

**Tech Stack:** React 19, Mantine 9.8 (`Table`, `Checkbox`, `Badge`, `Select`, `SegmentedControl`, `TextInput`, `Menu`, `Popover`, `Modal`, `Paper`, `Anchor`, `ScrollArea`), TypeScript 6, Jest + @mantine-tests/core + Testing Library, Storybook 8 (Vite), Next 16 docs. No new dependencies.

**Spec:** `docs/specs/2026-11-15-feature-set-design.md` (phase 4 row of "Build order", the "Work queue (example)" row of "Scenarios", the `ChatMessage` / `SystemEvent` types and the Rules). Steve's decisions of 2026-11-15 (plain Mantine `Table`, `Modal` for emails until phase 5, `controlRef`, example code in `docs/demos/WorkQueue/`) are folded in below.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Table | Plain Mantine `Table` (decided by Steve) with a checkbox column and sortable headers (`aria-sort` on the `th`, an `UnstyledButton` inside) | No extra dependency; twelve rows need no virtualisation |
| What the timeline is built on | `MessageList<TimelineItem>` with `renderItem`, not `TeamThread` | `TeamThread` takes only `ChatMessage \| SystemEvent` and has no `renderItem`, so it cannot show email cards. `MessageList` still gives date dividers, stick-to-bottom, the `role="log"` and `jumpTo`; chat rows and notes are built from `Message.*` parts, which is the recipe the spec promises |
| Email in the timeline | `EmailItem extends MessageBase { kind: 'email'; from; to; cc?; subject; text }`, an example type; a card with from, to, subject and a two-line preview; the subject is a button labelled `Open email: <subject>` | The card stays readable; one obvious control opens it |
| Opening an email | `EmailModal` (Mantine `Modal`, decided by Steve): From, To, Cc (when present), Date, then `EmailBody`, which shows `text` with `white-space: pre-wrap` | `EmailBody` is the one component phase 5 replaces with mantine-doc-viewer's email renderer; its doc comment says so |
| Replies | The composer appends a `ChatMessage` by `'me'`: `visibility: 'public'` in Reply mode, `'internal'` in Internal note mode (`draft.mode === 'note'`) | `Composer` has no To / Subject; a full email client is out of scope in the spec |
| Every change is logged | Each ticket action appends a `SystemEvent` authored by `'me'` ("You assigned this to Maya Lindqvist"); a change that changes nothing (same assignee, tag already there) is skipped, ticket object untouched | The timeline shows all four kinds growing live, and the Activity list gets something to jump to |
| `controlRef` | `controlRef?: React.Ref<MessageListControl>`, `interface MessageListControl { jumpTo: (id: string) => void }`, set with `useImperativeHandle(controlRef, () => ({ jumpTo }))` (no deps: `jumpTo` is new each render). Forwarded explicitly by `ChatThread`, `TeamThread` and `AssistantThread`; not by `ThreadPanel` | `ThreadPanel`'s other props go to its root `Box`; add it there on demand |
| Where the example lives and how it resolves `'mantine-messages'` | `docs/demos/WorkQueue/`, one copy. Jest: `moduleNameMapper` `'^mantine-messages$'` to `<rootDir>/package/src/index.ts`. Storybook: `viteFinal` alias `/^mantine-messages$/` to `package/src/index.ts` (exact name only, so `mantine-messages/markdown` still resolves normally). Root `tsc` (now including `docs/demos/WorkQueue`) and docs `tsc` read `package/dist` types, as the docs already do. Next resolves the workspace package (dist) | Without the alias Vite would load `package/dist/esm/index.mjs`: a build before every story change and none of the CSS modules (stories never import `styles.css`). Prototyped: `storybook build` puts the story in the same chunks as the package stories, and `npm run docs:build` passes |
| Tests and typecheck of the example | Tests sit next to the code (`docs/demos/WorkQueue/*.test.ts(x)`). `docs/tsconfig.json` excludes `**/*.test.ts` and `**/*.test.tsx`; the root `tsconfig.json` includes `docs/demos/WorkQueue`, so tests are typechecked with the Jest and jest-dom types | The docs config has no Jest types: without the exclude the docs typecheck fails with `Cannot find name 'describe'` (checked) |
| Coverage | `collectCoverageFrom` adds `docs/demos/WorkQueue/**/*.{ts,tsx}` and `!docs/demos/WorkQueue/types.ts`; the demo wrapper `docs/demos/WorkQueue.demo.tsx` stays out, like the other demos | 100% like the package; `types.ts` has no code |
| Layout | The app shows either the queue (filters, bulk bar, table) or one open ticket (header with "← Queue", timeline and composer, sidebar 260 px), not a split view | Fits the docs column; the table needs the width |
| Views | `inbox` (not closed, not snoozed), `snoozed` (not closed, snoozed), `closed`, `all`, each with its count in a `SegmentedControl`; filters for priority and assignee (`'unassigned'` too); search over id, subject, customer name and tags | Snoozed tickets leave the default view, as asked |
| Sorting | `priority` (urgent first ascending), `age` (newest first ascending), `sla` (soonest due first ascending, the default); clicking the sorted column flips it, another column starts ascending | |
| SLA | Closed: "Done", dimmed. Overdue: "Overdue 20m", red. Due within an hour: "45m left", orange. Later: "3h left", teal. Pending does not pause the clock | Enough to triage; real SLA policies belong to the app |
| Snooze | A `Popover` with "In 1 hour", "Tomorrow, 9:00", "Next Monday, 9:00" and a native `datetime-local` `TextInput` ("Snooze until then", enabled only for a time after `now`); a snoozed ticket shows "Snoozed until …" and Unsnooze | No `@mantine/dates` dependency |
| Clock | `WorkQueue` takes `now?: Date`, fixed at the first render; data is built relative to it (`createTickets(now)`) | Deterministic tests; a ticket snoozed for an hour stays hidden until reload, fine for a demo |
| Selection | Bulk actions apply to the selected ids and then clear the selection; changing a filter clears it too | Never acts on tickets the user cannot see |
| Docs demo code tab | `code` is a short excerpt of the timeline recipe with a link to the folder on GitHub | The app is a dozen files; pasting them into `code` would be the second copy Steve ruled out |

## Global Constraints

- Work-queue fields (status, priority, assignee, SLA, snooze, tags) live in `docs/demos/WorkQueue/types.ts`, never in `package/`.
- The package keeps its rules: `factory()`, `useProps`, Styles API, `data-*` modifiers; `[data-x]` not `:where()` for state rules; Mantine 9 `factory()` passes `ref` in props; props that clash with DOM events need `ElementProps<'div', 'name'>`. Example code may be plain components.
- `npm test` must pass: syncpack, oxfmt format check, `check:peers`, typecheck (root and docs), oxlint (`prefer-template`, `curly`), stylelint, Jest with 100% statements, branches, functions and lines over `package/src` and `docs/demos/WorkQueue`. Each task's commit stands at 100% on its own.
- Run `npm run build && npm run docgen` before `npm test` whenever exports, exported types or components change, and before the first typecheck of example code that uses `controlRef` or `MessageListControl`: the root and docs typechecks and the peer check read `package/dist`.
- Never write the text `ock` followed by `(` in any file (esbuild-jest then hands the file to Babel): never call `jest.mock`, and no function names ending in `ock`; map modules with `moduleNameMapper` instead.
- jsdom: any `scrollTop` a test defines must be `writable: true`; userEvent stubs the clipboard. `@mantine-tests/core` does not re-export `fireEvent`, `act` or `within`; import them from `@testing-library/react`.
- Mantine `Select` in tests: its input has role `combobox` (find it by `name` when it has a `label`, by placeholder when it only has `aria-label`, because the listbox carries the same label); its clear button is `aria-hidden`, so find it with `document.querySelector('[aria-label="…"]')`. `SegmentedControl` items are `radio`s. `Modal`'s close button has no name unless `closeButtonProps` gives one. `@mantine-tests/core`'s `render` uses `env="test"`: no transitions, so menus and modals open and close at once.
- `MessageList` is used as `<MessageList<TimelineItem> ...>` (the generic cast pattern from phase 1).
- Root `tsconfig.json` uses `"jsx": "react"`: every `.tsx` in the example imports `React`.
- Show output in Steve's watch tab: wrap commands as `{ printf '\n$ CMD\n'; CMD 2>&1; } | tee -a .claude/run.log`.
- Format before testing: `npx oxfmt -c oxfmt.config.mjs --write package/src docs .storybook`.
- Work on a branch: `git switch -c feat/work-queue` before Task 1. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `package/src/MessageList/MessageList.tsx` | `controlRef`, `MessageListControl` |
| `package/src/ChatThread/ChatThread.tsx`, `package/src/TeamThread/TeamThread.tsx`, `package/src/AssistantThread/AssistantThread.tsx` | forward `controlRef` |
| `package/src/index.ts` | exports the `MessageListControl` type |
| `jest.config.cjs`, `tsconfig.json`, `docs/tsconfig.json`, `.storybook/main.ts` | the example is tested, covered, typechecked and resolvable from Storybook |
| `docs/demos/WorkQueue/types.ts` (new) | `Ticket`, `EmailItem`, `TimelineItem`, `Customer`, `Agent`, filters and sort types |
| `docs/demos/WorkQueue/data.ts` (new) | agents, customers, `users`, `TAGS`, `createTickets(now)`: twelve tickets |
| `docs/demos/WorkQueue/queue.ts` (new) | labels and colours, `nameGetter`, views, filter, sort, SLA, durations, snooze choices, `queueReducer` |
| `docs/demos/WorkQueue/TriageTable.tsx`, `QueueFilters.tsx`, `BulkActions.tsx` (new) | the triage list |
| `docs/demos/WorkQueue/TicketTimeline.tsx`, `EmailCard.tsx`, `EmailModal.tsx` (new) | the mixed timeline and the opened email |
| `docs/demos/WorkQueue/TicketSidebar.tsx` (new) | assign, status, priority, snooze, tags, Activity |
| `docs/demos/WorkQueue/TicketView.tsx`, `WorkQueue.tsx` (new) | one ticket; the app shell |
| `package/src/WorkQueue.story.tsx` (new) | Storybook: `Work queue / Queue` and `Work queue / Open ticket` |
| `docs/demos/WorkQueue.demo.tsx` (new), `docs/demos/index.ts`, `docs/docs.mdx`, `CHANGELOG.md` | docs |

## Order and parallel lanes

| Task | Needs | Can run beside |
|---|---|---|
| 1. `controlRef` (package) | nothing | 2, 3 |
| 2. Example setup, types and data | nothing | 1 |
| 3. Queue logic | 2 | 1 |
| 4. Triage table, filters, bulk bar | 3 | 5, 6 |
| 5. Timeline, email card, email modal | 1 merged and built, 3 | 4, 6 |
| 6. Ticket sidebar (actions, snooze, Activity) | 3 | 4, 5 |
| 7. Ticket view and app shell | 4, 5, 6 | nothing |
| 8. Story, docs demo, docs and changelog | 7 | nothing |
| 9. Gate and browser check (lead) | 8 | nothing |

Tasks 4, 5 and 6 each create only their own files (and tests), so the lead can merge them in any order. Task 5 typechecks `controlRef` on `MessageList` through `package/dist`: run `npm run build` after merging Task 1, before Task 5's typecheck. Every task is fully specified below; Sonnet fits all lanes, and Task 9 is the lead's.

---

### Task 1: `controlRef` on `MessageList`, forwarded by the threads

**Files:**
- Modify: `package/src/MessageList/MessageList.tsx`, `package/src/MessageList/MessageList.scroll.test.tsx`
- Modify: `package/src/ChatThread/ChatThread.tsx`, `package/src/ChatThread/ChatThread.test.tsx`
- Modify: `package/src/TeamThread/TeamThread.tsx`, `package/src/TeamThread/TeamThread.test.tsx`
- Modify: `package/src/AssistantThread/AssistantThread.tsx`, `package/src/AssistantThread/AssistantThread.test.tsx`
- Modify: `package/src/index.ts`, `docs/docs.mdx`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `useMessageList(...)` returns `{ viewportRef, onScrollPositionChange, jumpTo, highlightedId }` (phase 1).
- Produces:
  - `export interface MessageListControl { jumpTo: (id: string) => void }` in `MessageList.tsx`, exported as a type from the root entry.
  - `MessageListProps.controlRef?: React.Ref<MessageListControl>`; same prop on `ChatThreadProps`, `TeamThreadProps`, `AssistantThreadProps`.
  - `jumpTo(id)` through the ref does exactly what `context.jumpTo(id)` in `renderItem` does: `scrollIntoView({ block: 'center' })` on `[data-item-id="<id>"]` and `highlighted: true` for 1.6 s.

- [ ] **Step 1: Write the failing tests**

In `package/src/MessageList/MessageList.scroll.test.tsx` change the import of `./MessageList` to:

```ts
import { MessageList, MessageListControl, MessageListProps } from './MessageList';
```

and add, before `it('never scrolls with autoScroll={false}', ...)`:

```tsx
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
```

In `package/src/ChatThread/ChatThread.test.tsx` add after the `@mantine-tests/core` import:

```ts
import { act } from '@testing-library/react';
```

and before `import type { ChatMessage, MessagesUser } from '../types';`:

```ts
import type { MessageListControl } from '../MessageList/MessageList';
```

and before `it('is a live log with a divider and every message', ...)`:

```tsx
  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<ChatThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('a'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="a"]'));
    scrollIntoView.mockRestore();
  });
```

In `package/src/TeamThread/TeamThread.test.tsx` add the same two imports (`act` after the `@mantine-tests/core` import; `MessageListControl` before `import type { ChatMessage, MessagesUser, SystemEvent } from '../types';`) and, before `it('is a live log with an event line and a name on the first message of a group', ...)`:

```tsx
  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<TeamThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('b'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="b"]'));
    scrollIntoView.mockRestore();
  });
```

In `package/src/AssistantThread/AssistantThread.test.tsx` (it already imports `act`) add before `import type { AssistantMessage } from '../types';`:

```ts
import type { MessageListControl } from '../MessageList/MessageList';
```

and before `it('renders an empty log without messages', ...)`:

```tsx
  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<AssistantThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('a1'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="a1"]'));
    scrollIntoView.mockRestore();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/MessageList && npx tsc --noEmit`
Expected: Jest FAIL, `jumps and flashes from outside the list through controlRef`: `TypeError: Cannot read properties of null (reading 'jumpTo')`. (The thread tests pass at run time, because their rest props already reach `MessageList`; `tsc` fails on them: `Module '"./MessageList"' has no exported member 'MessageListControl'` and `Property 'controlRef' does not exist on type ...`.)

- [ ] **Step 3: Implement**

In `package/src/MessageList/MessageList.tsx`:

Replace `import React from 'react';` with:

```ts
import React, { useImperativeHandle } from 'react';
```

Before `export interface MessageListProps<T extends MessageBase = MessageBase>` add:

```ts
/** What `controlRef` gives code outside the list */
export interface MessageListControl {
  /** Scrolls to the item with this `id` and flashes it */
  jumpTo: (id: string) => void;
}
```

At the end of `MessageListProps`, after `labels?: Partial<MessageListLabels>;`, add:

```ts

  /** Gets `{ jumpTo }`, so code outside the list can scroll to an item and flash it */
  controlRef?: React.Ref<MessageListControl>;
```

In the props destructuring add `controlRef,` after `labels,`. After `const allLabels = { ...defaultLabels, ...labels };` add:

```ts
  useImperativeHandle(controlRef, () => ({ jumpTo }));
```

In each of `package/src/ChatThread/ChatThread.tsx`, `package/src/TeamThread/TeamThread.tsx` and `package/src/AssistantThread/AssistantThread.tsx`:

- Replace `import { MessageList } from '../MessageList/MessageList';` with:

  ```ts
  import { MessageList, type MessageListControl } from '../MessageList/MessageList';
  ```

- At the end of the props interface, after its `labels?: Partial<...Labels>;`, add:

  ```ts

    /** Gets `{ jumpTo }` of the inner `MessageList`, to scroll to a message and flash it */
    controlRef?: React.Ref<MessageListControl>;
  ```

- In the props destructuring add `controlRef,` after `labels,`.
- On the `<MessageList<...>` element add `controlRef={controlRef}` right after `ref={ref}`.

In `package/src/index.ts`, in the `export type { ... } from './MessageList/MessageList';` list, add `MessageListControl,` after `MessageListLabels,`.

In `docs/docs.mdx`, in "## Building your own layout", after the `<MessageList ... />` code block, add:

````mdx
Inside `renderItem`, `jumpTo(id)` scrolls to an item and flashes it (`highlighted` is true for 1.6
seconds). To jump from outside the list, for example from a sidebar, pass `controlRef`; it gets
`{ jumpTo }`. `ChatThread`, `TeamThread` and `AssistantThread` take `controlRef` too and pass it to
their list.

```tsx
import { useRef } from 'react';
import { MessageList, type MessageListControl } from 'mantine-messages';

const list = useRef<MessageListControl>(null);

<MessageList controlRef={list} items={notes} renderItem={renderNote} />
<Button onClick={() => list.current?.jumpTo('n42')}>Show the first reply</Button>
```
````

In `CHANGELOG.md`, under `## Unreleased` / `### Added`, append:

```markdown
- `MessageList`: `controlRef` gets `{ jumpTo }`, so code outside the list can scroll to an item
  and flash it; `ChatThread`, `TeamThread` and `AssistantThread` pass it on. Type:
  `MessageListControl`
```

The Props tables on the docs site pick up `controlRef` from the doc comments through `npm run docgen`.

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test`
Expected: exit 0, 100%; `docs/docgen.json` lists `controlRef` under `MessageList`, `ChatThread`, `TeamThread` and `AssistantThread`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "MessageList: controlRef, so code outside the list can jump to a message

ChatThread, TeamThread and AssistantThread forward it. Exports MessageListControl.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Example setup, types and data

**Files:**
- Modify: `jest.config.cjs`, `tsconfig.json`, `docs/tsconfig.json`, `.storybook/main.ts`
- Create: `docs/demos/WorkQueue/types.ts`, `docs/demos/WorkQueue/data.ts`
- Test: `docs/demos/WorkQueue/data.test.ts`

**Interfaces:**
- Consumes: `ChatMessage`, `MessageBase`, `MessagesUser`, `SystemEvent` types from `'mantine-messages'`.
- Produces (`types.ts`): `TicketStatus = 'open' | 'pending' | 'closed'`; `TicketPriority = 'urgent' | 'high' | 'normal' | 'low'`; `EmailItem`; `TimelineItem = EmailItem | ChatMessage | SystemEvent`; `Ticket { id; subject; customerId; status; priority; assigneeId: string | null; tags: string[]; createdAt: Date; slaDueAt: Date; snoozedUntil: Date | null; items: TimelineItem[] }`; `Agent = MessagesUser`; `Customer extends MessagesUser { email }`; `QueueView = 'inbox' | 'snoozed' | 'closed' | 'all'`; `QueueFilters { view; search; priority: TicketPriority | null; assigneeId: string | null }`; `SortKey = 'priority' | 'age' | 'sla'`; `QueueSort { key; direction: 'asc' | 'desc' }`.
- Produces (`data.ts`): `SUPPORT_ADDRESS`, `TAGS: string[]`, `agents: Agent[]` (`'me'` is "You"), `customers: Customer[]`, `users: MessagesUser[]`, `createTickets(now: Date): Ticket[]` (twelve tickets, item ids `<ticket id>-1`, `-2`, … oldest first; T-1034 snoozed for two days, T-1032 closed; T-1042's first email has a Cc).
- Produces (config): `'mantine-messages'` resolves to `package/src/index.ts` in Jest and Storybook.

- [ ] **Step 1: Point the tools at the example**

In `jest.config.cjs`, append to `collectCoverageFrom` (after `'!package/src/types.ts',`):

```js
    // The work-queue example is tested like the package
    'docs/demos/WorkQueue/**/*.{ts,tsx}',
    '!docs/demos/WorkQueue/types.ts',
```

and in `moduleNameMapper`, before the `'\\.(css)$'` entry:

```js
    // The example imports the package by name, as an app does; tests run it against the source
    '^mantine-messages$': '<rootDir>/package/src/index.ts',
```

In `tsconfig.json` replace the `include` line with:

```json
  "include": ["package", "scripts", "@types", "test-utils", "docs/demos/WorkQueue"],
```

In `docs/tsconfig.json` replace the `exclude` line with (the docs config has no Jest types; the root config typechecks these tests):

```json
  "exclude": ["node_modules", "**/*.test.ts", "**/*.test.tsx"]
```

Replace `.storybook/main.ts` with:

```ts
import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join, resolve } from 'path';
import { mergeConfig } from 'vite';

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../package/src/**/*.story.@(js|jsx|mjs|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-essentials')],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  docs: {
    autodocs: false,
  },
  // The work-queue example in docs/demos imports 'mantine-messages' as an app does. Point that
  // at the source, so its story needs no build and gets the package's CSS modules. Only the bare
  // name: subpaths such as 'mantine-messages/markdown' are not aliased
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: [
          {
            find: /^mantine-messages$/,
            replacement: resolve(__dirname, '../package/src/index.ts'),
          },
        ],
      },
    }),
};

export default config;
```

- [ ] **Step 2: Write the failing test**

Create `docs/demos/WorkQueue/data.test.ts`:

```ts
import { agents, createTickets, customers, SUPPORT_ADDRESS, users } from './data';
import type { TimelineItem } from './types';

const now = new Date(2026, 10, 16, 10, 0);

const kindOf = (item: TimelineItem) => {
  if ('kind' in item) {
    return item.kind;
  }

  return item.visibility === 'internal' ? 'note' : 'chat';
};

describe('work queue data', () => {
  const tickets = createTickets(now);

  it('has twelve tickets whose timelines together mix all four kinds of item', () => {
    expect(tickets).toHaveLength(12);
    const kinds = new Set(tickets.flatMap((ticket) => ticket.items.map(kindOf)));
    expect([...kinds].sort()).toEqual(['chat', 'email', 'event', 'note']);
  });

  it('numbers items per ticket, oldest first, all in the past', () => {
    for (const ticket of tickets) {
      expect(ticket.items.map((item) => item.id)).toEqual(
        ticket.items.map((_, index) => `${ticket.id}-${index + 1}`)
      );
      const times = ticket.items.map((item) => new Date(item.createdAt).getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(Math.max(...times)).toBeLessThan(now.getTime());
    }
  });

  it('addresses customer emails to support and agent emails to the customer', () => {
    const csv = tickets.find((ticket) => ticket.id === 'T-1040')!;
    const [question, answer] = csv.items.filter((item) => 'kind' in item && item.kind === 'email');
    expect(question).toMatchObject({
      from: { name: 'Aiko Tanaka', address: 'aiko@paperplane.example' },
      to: [SUPPORT_ADDRESS],
    });
    expect(answer).toMatchObject({
      from: { name: 'Priya Raman', address: SUPPORT_ADDRESS },
      to: ['aiko@paperplane.example'],
    });
  });

  it('knows every author, and every customer and assignee', () => {
    const ids = new Set(users.map((user) => user.id));
    expect(users).toHaveLength(agents.length + customers.length);

    for (const ticket of tickets) {
      expect(ids.has(ticket.customerId)).toBe(true);
      expect(ticket.assigneeId === null || ids.has(ticket.assigneeId)).toBe(true);
      ticket.items
        .filter((item) => !('kind' in item && item.kind === 'event'))
        .forEach((item) => expect(ids.has(item.authorId)).toBe(true));
    }
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx jest docs/demos/WorkQueue`
Expected: FAIL, `Cannot find module './data' from 'docs/demos/WorkQueue/data.test.ts'`.

- [ ] **Step 4: Implement**

Create `docs/demos/WorkQueue/types.ts`:

```ts
import type { ChatMessage, MessageBase, MessagesUser, SystemEvent } from 'mantine-messages';

// Work-queue fields belong to this example app, never to the package

export type TicketStatus = 'open' | 'pending' | 'closed';

export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';

/** An email in a ticket's timeline, shown as a card; the full message opens in a modal */
export interface EmailItem extends MessageBase {
  kind: 'email';
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  subject: string;

  /** Plain text body */
  text: string;
}

/**
 * One entry of a ticket's timeline: an email, a chat message, an internal note (a ChatMessage with
 * `visibility: 'internal'`) or an event such as "Assigned to Maya"
 */
export type TimelineItem = EmailItem | ChatMessage | SystemEvent;

export interface Ticket {
  id: string;
  subject: string;

  /** `id` of the customer, a MessagesUser in the users list */
  customerId: string;
  status: TicketStatus;
  priority: TicketPriority;

  /** `id` of the agent working on it, or null */
  assigneeId: string | null;
  tags: string[];
  createdAt: Date;

  /** When the next answer is due */
  slaDueAt: Date;

  /** Hidden from the default view until then */
  snoozedUntil: Date | null;

  /** Oldest first */
  items: TimelineItem[];
}

/** Someone who can be assigned tickets */
export type Agent = MessagesUser;

/** Someone who writes to support */
export interface Customer extends MessagesUser {
  email: string;
}

/** Which tickets the table shows */
export type QueueView = 'inbox' | 'snoozed' | 'closed' | 'all';

export interface QueueFilters {
  view: QueueView;
  search: string;
  priority: TicketPriority | null;

  /** An agent's `id`, `'unassigned'`, or null for anyone */
  assigneeId: string | null;
}

export type SortKey = 'priority' | 'age' | 'sla';

export interface QueueSort {
  key: SortKey;
  direction: 'asc' | 'desc';
}
```

Create `docs/demos/WorkQueue/data.ts`:

```ts
import type { ChatMessage, MessagesUser } from 'mantine-messages';
import type { Agent, Customer, EmailItem, Ticket, TimelineItem } from './types';

export const SUPPORT_ADDRESS = 'support@lumen.example';

/** Tags the bulk and ticket actions offer */
export const TAGS = ['billing', 'bug', 'refund', 'api', 'vip', 'feature-request'];

export const agents: Agent[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
  { id: 'priya', name: 'Priya Raman' },
  { id: 'sam', name: 'Sam Whitaker' },
];

export const customers: Customer[] = [
  { id: 'nora', name: 'Nora Feld', email: 'nora@brightloop.example' },
  { id: 'luis', name: 'Luis Ortega', email: 'luis.ortega@hollow.example' },
  { id: 'aiko', name: 'Aiko Tanaka', email: 'aiko@paperplane.example' },
  { id: 'ben', name: 'Ben Carter', email: 'ben@carterco.example' },
  { id: 'fatima', name: 'Fatima Zahra', email: 'fz@northwind.example' },
  { id: 'jonas', name: 'Jonas Becker', email: 'jonas.becker@kiln.example' },
  { id: 'grace', name: 'Grace Liu', email: 'grace@orbit.example' },
  { id: 'omar', name: 'Omar Haddad', email: 'omar@saltmarsh.example' },
  { id: 'elena', name: 'Elena Rossi', email: 'elena.rossi@verde.example' },
  { id: 'kwame', name: 'Kwame Mensah', email: 'kwame@baobab.example' },
  { id: 'sofia', name: 'Sofia Novak', email: 'sofia@lumenfans.example' },
  { id: 'dev', name: 'Dev Patel', email: 'dev@quarry.example' },
];

/** Everyone who can write in a timeline, for names and avatars */
export const users: MessagesUser[] = [...agents, ...customers];

const MINUTE = 60 * 1000;

/** Builds one ticket's timeline with ids `<ticket>-1`, `<ticket>-2`, … and times relative to now */
function timeline(ticketId: string, now: Date, customer: Customer) {
  const items: TimelineItem[] = [];
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE);
  const next = () => `${ticketId}-${items.length + 1}`;

  return {
    items,
    email(minutesAgo: number, from: MessagesUser, subject: string, text: string) {
      const fromCustomer = from.id === customer.id;
      const email: EmailItem = {
        id: next(),
        kind: 'email',
        authorId: from.id,
        createdAt: at(minutesAgo),
        from: { name: from.name, address: fromCustomer ? customer.email : SUPPORT_ADDRESS },
        to: [fromCustomer ? SUPPORT_ADDRESS : customer.email],
        subject,
        text,
      };
      items.push(email);
      return email;
    },
    chat(minutesAgo: number, authorId: string, body: string) {
      const message: ChatMessage = { id: next(), authorId, body, createdAt: at(minutesAgo) };
      items.push(message);
    },
    note(minutesAgo: number, authorId: string, body: string) {
      items.push({
        id: next(),
        authorId,
        body,
        createdAt: at(minutesAgo),
        visibility: 'internal',
      });
    },
    event(minutesAgo: number, text: string) {
      items.push({
        id: next(),
        kind: 'event',
        authorId: 'system',
        text,
        createdAt: at(minutesAgo),
      });
    },
  };
}

const customer = (id: string) => customers.find((item) => item.id === id)!;

/** Twelve tickets whose timelines mix emails, chat, internal notes and events */
export function createTickets(now: Date): Ticket[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * MINUTE);
  const due = (minutes: number) => new Date(now.getTime() + minutes * MINUTE);
  const base = { tags: [] as string[], snoozedUntil: null, assigneeId: null };

  const t1042 = timeline('T-1042', now, customer('nora'));
  const doubleCharge = t1042.email(
    95,
    customer('nora'),
    'Charged twice for the March invoice',
    'Hi,\n\nOur card was charged twice for invoice INV-2291 (USD 1,240.00 each, both on March 3).\nCan you refund the duplicate?\n\nThanks,\nNora Feld\nFinance, Brightloop'
  );
  doubleCharge.cc = ['ap@brightloop.example'];
  t1042.event(94, 'Ticket created from email');
  t1042.note(
    60,
    'maya',
    'Stripe shows two captures 4 seconds apart. Looks like the retry bug from last week.'
  );
  t1042.chat(12, 'nora', 'Hi, following up on my email about the double charge. Any news?');

  const t1041 = timeline('T-1041', now, customer('luis'));
  t1041.chat(80, 'luis', 'I reset my password and now it says my account is locked.');
  t1041.event(79, 'Maya Lindqvist assigned this to Theo Okafor');
  t1041.chat(70, 'theo', 'Sorry about that, Luis. Let me check your account.');
  t1041.note(68, 'theo', 'Locked after 5 failed attempts with the old password. Unlocking.');
  t1041.email(
    40,
    customer('luis'),
    'Re: Account locked',
    'Still locked on my side. I tried in a private window too.\n\nLuis'
  );

  const t1040 = timeline('T-1040', now, customer('aiko'));
  t1040.email(
    300,
    customer('aiko'),
    'CSV export drops accented characters',
    'Hello,\n\nWhen I export the contacts list to CSV, names like "José" come out as "Jos?".\nThis happens in Excel and Numbers.\n\nAiko'
  );
  t1040.note(250, 'priya', 'Reproduced. Export is written as Latin-1; filed BUG-881.');
  t1040.email(
    240,
    agents[3],
    'Re: CSV export drops accented characters',
    'Hi Aiko,\n\nThanks for the report, we could reproduce it. A fix is planned for next week; until then, "Export as XLSX" keeps the accents.\n\nPriya'
  );
  t1040.event(239, 'Priya Raman changed the status to Pending');

  const t1039 = timeline('T-1039', now, customer('ben'));
  t1039.chat(1500, 'ben', 'Any plans for a dark mode? My team works late.');
  t1039.event(1499, 'Ticket created from chat');
  t1039.note(1400, 'sam', 'Add to the dark mode feature request, 14 votes now.');
  t1039.email(
    1300,
    customer('ben'),
    'Dark mode',
    'Following up from chat: we would also love a high-contrast option.\n\nBen'
  );

  const t1038 = timeline('T-1038', now, customer('fatima'));
  t1038.email(
    50,
    customer('fatima'),
    'Webhook deliveries failing with 410',
    'Since this morning every delivery to https://hooks.northwind.example/lumen returns 410 on your side, according to the delivery log. Nothing changed on our end.\n\nFatima'
  );
  t1038.event(49, 'Theo Okafor changed the priority to Urgent');
  t1038.note(30, 'theo', 'The 410 comes from their proxy, not from us. Asking for proxy logs.');
  t1038.chat(10, 'fatima', 'Our ops team is online now if a call helps.');

  const t1037 = timeline('T-1037', now, customer('jonas'));
  t1037.chat(200, 'jonas', 'We want to move to the annual plan. Do we keep our current price?');
  t1037.note(180, 'sam', 'Eligible for the 2025 price lock. Sending a quote.');
  t1037.email(
    150,
    agents[4],
    'Your annual plan quote',
    'Hi Jonas,\n\nYour quote: 25 seats on the annual plan at your current price, USD 9,000 a year.\n\nSam'
  );

  const t1036 = timeline('T-1036', now, customer('grace'));
  t1036.email(
    2000,
    customer('grace'),
    'Refund for unused seats',
    'We removed 10 seats in February but were billed for 30 again in March. Please refund the difference.\n\nGrace'
  );
  t1036.email(
    1900,
    agents[1],
    'Re: Refund for unused seats',
    'Hi Grace,\n\nI have asked finance to refund 10 seats for March. You will see it in 5-10 business days.\n\nMaya'
  );
  t1036.note(1890, 'maya', 'Refund request REF-310 sent to finance.');
  t1036.event(1889, 'Maya Lindqvist changed the status to Pending');

  const t1035 = timeline('T-1035', now, customer('omar'));
  t1035.email(
    400,
    customer('omar'),
    'SSO setup with Okta',
    'We are setting up SSO with Okta. Which ACS URL and entity ID should we use?\n\nOmar'
  );
  t1035.event(399, 'Sam Whitaker assigned this to Theo Okafor');
  t1035.chat(
    300,
    'theo',
    'Hi Omar, I sent the SAML details by email. Ping me here if anything fails.'
  );
  t1035.note(290, 'theo', 'Saltmarsh is on the Enterprise trial; VIP.');

  const t1034 = timeline('T-1034', now, customer('elena'));
  t1034.email(
    3000,
    customer('elena'),
    'Change of invoice address',
    'Please send future invoices to our new office: Via Roma 12, 20121 Milano.\n\nElena'
  );
  t1034.note(2900, 'priya', 'Waiting for their VAT number before we can change it. Snoozed.');
  t1034.event(2899, 'Priya Raman snoozed this for two days');

  const t1033 = timeline('T-1033', now, customer('kwame'));
  t1033.chat(240, 'kwame', 'The Android app crashes as soon as I open it. Pixel 8, Android 15.');
  t1033.email(
    200,
    customer('kwame'),
    'Crash logs',
    'Here is what adb logcat shows:\n\nFATAL EXCEPTION: main\njava.lang.IllegalStateException: WebView not initialised\n\nKwame'
  );
  t1033.event(199, 'Ticket created from chat');
  t1033.note(150, 'me', 'Same stack trace as BUG-874. Mobile team is on it.');

  const t1032 = timeline('T-1032', now, customer('sofia'));
  t1032.chat(5000, 'sofia', 'How do I add a teammate to my workspace?');
  t1032.chat(4990, 'sam', 'Settings, then Members, then Invite. They get an email right away.');
  t1032.chat(4980, 'sofia', 'Found it, thanks!');
  t1032.event(4979, 'Sam Whitaker closed this');

  const t1031 = timeline('T-1031', now, customer('dev'));
  t1031.email(
    600,
    customer('dev'),
    'Data deletion request',
    'Under GDPR article 17, please delete all personal data you hold about me and confirm in writing.\n\nDev Patel'
  );
  t1031.note(550, 'me', 'Deletion job scheduled; legal wants the confirmation sent after it runs.');
  t1031.email(
    540,
    agents[0],
    'Re: Data deletion request',
    'Hi Dev,\n\nWe have scheduled the deletion of your data. We will confirm by email once it is complete, within 30 days.\n\nLumen Support'
  );
  t1031.event(539, 'You changed the status to Pending');

  const tickets: Ticket[] = [
    {
      ...base,
      id: 'T-1042',
      subject: 'Charged twice for the March invoice',
      customerId: 'nora',
      status: 'open',
      priority: 'urgent',
      tags: ['billing'],
      createdAt: ago(95),
      slaDueAt: ago(20),
      items: t1042.items,
    },
    {
      ...base,
      id: 'T-1041',
      subject: 'Account locked after password reset',
      customerId: 'luis',
      status: 'open',
      priority: 'high',
      assigneeId: 'theo',
      createdAt: ago(80),
      slaDueAt: due(45),
      items: t1041.items,
    },
    {
      ...base,
      id: 'T-1040',
      subject: 'CSV export drops accented characters',
      customerId: 'aiko',
      status: 'pending',
      priority: 'normal',
      assigneeId: 'priya',
      tags: ['bug'],
      createdAt: ago(300),
      slaDueAt: due(360),
      items: t1040.items,
    },
    {
      ...base,
      id: 'T-1039',
      subject: 'Request: dark mode for the dashboard',
      customerId: 'ben',
      status: 'open',
      priority: 'low',
      tags: ['feature-request'],
      createdAt: ago(1500),
      slaDueAt: due(2880),
      items: t1039.items,
    },
    {
      ...base,
      id: 'T-1038',
      subject: 'Webhook deliveries failing with 410',
      customerId: 'fatima',
      status: 'open',
      priority: 'urgent',
      assigneeId: 'me',
      tags: ['api', 'bug'],
      createdAt: ago(50),
      slaDueAt: due(15),
      items: t1038.items,
    },
    {
      ...base,
      id: 'T-1037',
      subject: 'Upgrade to the annual plan',
      customerId: 'jonas',
      status: 'open',
      priority: 'normal',
      assigneeId: 'sam',
      tags: ['billing'],
      createdAt: ago(200),
      slaDueAt: due(180),
      items: t1037.items,
    },
    {
      ...base,
      id: 'T-1036',
      subject: 'Refund for unused seats',
      customerId: 'grace',
      status: 'pending',
      priority: 'high',
      assigneeId: 'maya',
      tags: ['billing', 'refund'],
      createdAt: ago(2000),
      slaDueAt: due(1440),
      items: t1036.items,
    },
    {
      ...base,
      id: 'T-1035',
      subject: 'SSO setup with Okta',
      customerId: 'omar',
      status: 'open',
      priority: 'normal',
      assigneeId: 'theo',
      tags: ['vip'],
      createdAt: ago(400),
      slaDueAt: due(300),
      items: t1035.items,
    },
    {
      ...base,
      id: 'T-1034',
      subject: 'Change of invoice address',
      customerId: 'elena',
      status: 'open',
      priority: 'low',
      assigneeId: 'priya',
      tags: ['billing'],
      createdAt: ago(3000),
      slaDueAt: due(4000),
      snoozedUntil: due(2 * 24 * 60),
      items: t1034.items,
    },
    {
      ...base,
      id: 'T-1033',
      subject: 'Android app crashes on launch',
      customerId: 'kwame',
      status: 'open',
      priority: 'high',
      tags: ['bug'],
      createdAt: ago(240),
      slaDueAt: ago(120),
      items: t1033.items,
    },
    {
      ...base,
      id: 'T-1032',
      subject: 'How do I add a teammate?',
      customerId: 'sofia',
      status: 'closed',
      priority: 'low',
      assigneeId: 'sam',
      createdAt: ago(5000),
      slaDueAt: ago(4000),
      items: t1032.items,
    },
    {
      ...base,
      id: 'T-1031',
      subject: 'Data deletion request',
      customerId: 'dev',
      status: 'pending',
      priority: 'high',
      assigneeId: 'me',
      createdAt: ago(600),
      slaDueAt: due(2880),
      items: t1031.items,
    },
  ];

  return tickets;
}
```

- [ ] **Step 5: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs .storybook && npm run build && npm test`
Expected: exit 0, 100%; the coverage table has a `docs/demos/WorkQueue` row with `data.ts` at 100% and no `types.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Work queue example: types, twelve tickets, and Jest, tsc and Storybook set up for it

The example imports 'mantine-messages' like an app; Jest and Storybook map that name to the
package source, so it is tested at 100% and its story needs no build.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Queue logic

**Files:**
- Create: `docs/demos/WorkQueue/queue.ts`
- Test: `docs/demos/WorkQueue/queue.test.ts`

**Interfaces:**
- Consumes: Task 2 types and `createTickets`, `agents`, `users`.
- Produces:
  - `STATUS_LABELS`, `PRIORITY_LABELS`, `STATUS_COLORS`, `PRIORITY_COLORS` (records over `TicketStatus` / `TicketPriority`)
  - `DEFAULT_FILTERS: QueueFilters` (`view: 'inbox'`, empty search, `null` filters)
  - `nameGetter(users: MessagesUser[]): (id: string) => string` (falls back to the id)
  - `isSnoozed(ticket, now): boolean`, `inView(ticket, view, now): boolean`, `countByView(tickets, now): Record<QueueView, number>`
  - `filterTickets(tickets, filters, now, nameOf): Ticket[]`, `sortTickets(tickets, sort): Ticket[]` (a copy), `nextSort(sort, key): QueueSort`
  - `formatDuration(ms): string` (`'45m'`, `'3h'`, `'2d'`), `formatAge(ticket, now)`, `slaState(ticket, now): { label: string; color: string }`, `formatDateTime(date): string`, `snoozeOptions(now): { label: string; until: Date }[]`
  - `type QueueAction = { type: 'assign'; ids; assignee: Agent | null; at } | { type: 'setStatus'; ids; status; at } | { type: 'setPriority'; ids; priority; at } | { type: 'addTag'; ids; tag; at } | { type: 'snooze'; ids; until: Date | null; at } | { type: 'send'; id; text; note: boolean; at }`
  - `queueReducer(tickets: Ticket[], action: QueueAction): Ticket[]`: field changes append a `SystemEvent` (`authorId: 'me'`, id `<ticket>-<items.length + 1>`); `send` appends a `ChatMessage` with `visibility: 'internal'` or `'public'`; tickets that would not change are returned as the same object.

- [ ] **Step 1: Write the failing test**

Create `docs/demos/WorkQueue/queue.test.ts`:

```ts
import { agents, createTickets, users } from './data';
import {
  countByView,
  DEFAULT_FILTERS,
  filterTickets,
  formatAge,
  formatDuration,
  inView,
  isSnoozed,
  nameGetter,
  nextSort,
  queueReducer,
  slaState,
  snoozeOptions,
  sortTickets,
} from './queue';
import type { QueueFilters, Ticket } from './types';

// A Monday
const now = new Date(2026, 10, 16, 10, 0);
const tickets = createTickets(now);
const nameOf = nameGetter(users);
const byId = (list: Ticket[], id: string) => list.find((ticket) => ticket.id === id)!;
const ids = (list: Ticket[]) => list.map((ticket) => ticket.id);
const filter = (filters: Partial<QueueFilters>) =>
  ids(filterTickets(tickets, { ...DEFAULT_FILTERS, ...filters }, now, nameOf));
const minutes = (count: number) => count * 60000;
const lastItem = (ticket: Ticket) => ticket.items[ticket.items.length - 1];

describe('nameGetter', () => {
  it('names users and falls back to the id', () => {
    expect(nameOf('nora')).toBe('Nora Feld');
    expect(nameOf('system')).toBe('system');
  });
});

describe('views', () => {
  it('keeps snoozed and closed tickets out of the inbox', () => {
    expect(isSnoozed(byId(tickets, 'T-1034'), now)).toBe(true);
    expect(isSnoozed(byId(tickets, 'T-1034'), new Date(now.getTime() + minutes(3 * 24 * 60)))).toBe(
      false
    );
    expect(countByView(tickets, now)).toEqual({ inbox: 10, snoozed: 1, closed: 1, all: 12 });
    expect(inView(byId(tickets, 'T-1032'), 'all', now)).toBe(true);
  });
});

describe('filterTickets', () => {
  it('shows the view', () => {
    expect(filter({ view: 'snoozed' })).toEqual(['T-1034']);
    expect(filter({ view: 'closed' })).toEqual(['T-1032']);
    expect(filter({ view: 'all' })).toHaveLength(12);
  });

  it('searches ids, subjects, customers and tags, ignoring case and spaces', () => {
    expect(filter({ search: ' t-1038 ' })).toEqual(['T-1038']);
    expect(filter({ search: 'CSV' })).toEqual(['T-1040']);
    expect(filter({ search: 'nora' })).toEqual(['T-1042']);
    expect(filter({ search: 'refund' })).toEqual(['T-1036']);
  });

  it('filters by priority and assignee, or unassigned', () => {
    expect(filter({ priority: 'urgent' })).toEqual(['T-1042', 'T-1038']);
    expect(filter({ assigneeId: 'theo' })).toEqual(['T-1041', 'T-1035']);
    expect(filter({ assigneeId: 'unassigned' })).toEqual(['T-1042', 'T-1039', 'T-1033']);
  });
});

describe('sorting', () => {
  it('sorts by priority, age and SLA in both directions', () => {
    const open = filterTickets(tickets, DEFAULT_FILTERS, now, nameOf);
    expect(ids(sortTickets(open, { key: 'priority', direction: 'asc' })).slice(0, 2)).toEqual([
      'T-1042',
      'T-1038',
    ]);
    expect(ids(sortTickets(open, { key: 'age', direction: 'asc' }))[0]).toBe('T-1038');
    expect(ids(sortTickets(open, { key: 'age', direction: 'desc' }))[0]).toBe('T-1036');
    expect(ids(sortTickets(open, { key: 'sla', direction: 'asc' })).slice(0, 3)).toEqual([
      'T-1033',
      'T-1042',
      'T-1038',
    ]);
    expect(ids(open)[0]).toBe('T-1042');
  });

  it('flips the direction of the sorted column; another column starts ascending', () => {
    expect(nextSort({ key: 'sla', direction: 'asc' }, 'sla')).toEqual({
      key: 'sla',
      direction: 'desc',
    });
    expect(nextSort({ key: 'sla', direction: 'desc' }, 'sla').direction).toBe('asc');
    expect(nextSort({ key: 'sla', direction: 'desc' }, 'age')).toEqual({
      key: 'age',
      direction: 'asc',
    });
  });
});

describe('times', () => {
  it('formats durations in minutes, hours and days', () => {
    expect(formatDuration(0)).toBe('1m');
    expect(formatDuration(-minutes(45))).toBe('45m');
    expect(formatDuration(minutes(150))).toBe('3h');
    expect(formatDuration(minutes(3000))).toBe('2d');
    expect(formatAge(byId(tickets, 'T-1039'), now)).toBe('1d');
  });

  it('colours the SLA: overdue, due within the hour, later, and done when closed', () => {
    expect(slaState(byId(tickets, 'T-1042'), now)).toEqual({ label: 'Overdue 20m', color: 'red' });
    expect(slaState(byId(tickets, 'T-1038'), now)).toEqual({ label: '15m left', color: 'orange' });
    expect(slaState(byId(tickets, 'T-1037'), now)).toEqual({ label: '3h left', color: 'teal' });
    expect(slaState(byId(tickets, 'T-1032'), now)).toEqual({ label: 'Done', color: 'dimmed' });
  });

  it('offers snoozing for an hour, until tomorrow and until next Monday at 9:00', () => {
    const [hour, tomorrow, monday] = snoozeOptions(now);
    expect(hour.until).toEqual(new Date(2026, 10, 16, 11, 0));
    expect(tomorrow.until).toEqual(new Date(2026, 10, 17, 9, 0));
    // On a Monday, next Monday is a week away
    expect(monday.until).toEqual(new Date(2026, 10, 23, 9, 0));
    // On a Friday, three days
    expect(snoozeOptions(new Date(2026, 10, 20, 15, 0))[2].until).toEqual(
      new Date(2026, 10, 23, 9, 0)
    );
  });
});

describe('queueReducer', () => {
  const at = new Date(now.getTime() + minutes(1));

  it('assigns and unassigns, logging an event, and skips tickets that already match', () => {
    const maya = agents[1];
    let next = queueReducer(tickets, {
      type: 'assign',
      ids: ['T-1042', 'T-1036'],
      assignee: maya,
      at,
    });
    expect(byId(next, 'T-1042').assigneeId).toBe('maya');
    expect(lastItem(byId(next, 'T-1042'))).toEqual({
      id: 'T-1042-5',
      kind: 'event',
      authorId: 'me',
      text: 'You assigned this to Maya Lindqvist',
      createdAt: at,
    });
    // Already Maya's: unchanged, no event
    expect(byId(next, 'T-1036')).toBe(byId(tickets, 'T-1036'));
    // Not selected: unchanged
    expect(byId(next, 'T-1041')).toBe(byId(tickets, 'T-1041'));

    next = queueReducer(next, { type: 'assign', ids: ['T-1042'], assignee: null, at });
    expect(byId(next, 'T-1042').assigneeId).toBeNull();
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({ text: 'You unassigned this' });
  });

  it('changes status and priority', () => {
    let next = queueReducer(tickets, {
      type: 'setStatus',
      ids: ['T-1042', 'T-1032'],
      status: 'closed',
      at,
    });
    expect(byId(next, 'T-1042').status).toBe('closed');
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: 'You changed the status to Closed',
    });
    expect(byId(next, 'T-1032')).toBe(byId(tickets, 'T-1032'));

    // Both are urgent already: nothing changes
    const closed = next;
    next = queueReducer(next, {
      type: 'setPriority',
      ids: ['T-1042', 'T-1038'],
      priority: 'urgent',
      at,
    });
    expect(next).toEqual(closed);
    next = queueReducer(next, { type: 'setPriority', ids: ['T-1042'], priority: 'low', at });
    expect(byId(next, 'T-1042').priority).toBe('low');
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: 'You changed the priority to Low',
    });
  });

  it('adds a tag once', () => {
    const next = queueReducer(tickets, {
      type: 'addTag',
      ids: ['T-1042', 'T-1041'],
      tag: 'billing',
      at,
    });
    expect(byId(next, 'T-1042')).toBe(byId(tickets, 'T-1042'));
    expect(byId(next, 'T-1041').tags).toEqual(['billing']);
    expect(lastItem(byId(next, 'T-1041'))).toMatchObject({ text: 'You tagged this billing' });
  });

  it('snoozes until a time and unsnoozes', () => {
    const until = new Date(2026, 10, 17, 9, 0);
    let next = queueReducer(tickets, { type: 'snooze', ids: ['T-1042'], until, at });
    expect(byId(next, 'T-1042').snoozedUntil).toBe(until);
    expect(inView(byId(next, 'T-1042'), 'inbox', now)).toBe(false);
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: expect.stringContaining('You snoozed this until'),
    });

    next = queueReducer(next, { type: 'snooze', ids: ['T-1042'], until: null, at });
    expect(byId(next, 'T-1042').snoozedUntil).toBeNull();
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({ text: 'You unsnoozed this' });
  });

  it('appends a public reply or an internal note to one ticket', () => {
    let next = queueReducer(tickets, {
      type: 'send',
      id: 'T-1042',
      text: 'Refunded!',
      note: false,
      at,
    });
    expect(lastItem(byId(next, 'T-1042'))).toEqual({
      id: 'T-1042-5',
      authorId: 'me',
      body: 'Refunded!',
      createdAt: at,
      visibility: 'public',
    });
    expect(byId(next, 'T-1041')).toBe(byId(tickets, 'T-1041'));

    next = queueReducer(next, {
      type: 'send',
      id: 'T-1042',
      text: 'Done in Stripe',
      note: true,
      at,
    });
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      id: 'T-1042-6',
      visibility: 'internal',
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest docs/demos/WorkQueue/queue`
Expected: FAIL, `Cannot find module './queue' from 'docs/demos/WorkQueue/queue.test.ts'`.

- [ ] **Step 3: Implement**

Create `docs/demos/WorkQueue/queue.ts`:

```ts
import type { ChatMessage, MessagesUser, SystemEvent } from 'mantine-messages';
import type {
  Agent,
  QueueFilters,
  QueueSort,
  QueueView,
  Ticket,
  TicketPriority,
  TicketStatus,
} from './types';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'blue',
  pending: 'grape',
  closed: 'gray',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgent: 'red',
  high: 'orange',
  normal: 'blue',
  low: 'gray',
};

const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export const DEFAULT_FILTERS: QueueFilters = {
  view: 'inbox',
  search: '',
  priority: null,
  assigneeId: null,
};

/** `nameOf(id)`: the user's name, or the id for someone unknown */
export const nameGetter = (users: MessagesUser[]) => (id: string) =>
  users.find((user) => user.id === id)?.name ?? id;

export const isSnoozed = (ticket: Ticket, now: Date) =>
  ticket.snoozedUntil !== null && ticket.snoozedUntil > now;

/** Inbox: not closed and not snoozed. Snoozed: not closed, snoozed. Closed. All */
export function inView(ticket: Ticket, view: QueueView, now: Date) {
  const closed = ticket.status === 'closed';

  switch (view) {
    case 'inbox':
      return !closed && !isSnoozed(ticket, now);
    case 'snoozed':
      return !closed && isSnoozed(ticket, now);
    case 'closed':
      return closed;
    default:
      return true;
  }
}

export function countByView(tickets: Ticket[], now: Date): Record<QueueView, number> {
  const count = (view: QueueView) => tickets.filter((ticket) => inView(ticket, view, now)).length;
  return {
    inbox: count('inbox'),
    snoozed: count('snoozed'),
    closed: count('closed'),
    all: tickets.length,
  };
}

/** Tickets in the view that match the search (id, subject, customer, tags) and the filters */
export function filterTickets(
  tickets: Ticket[],
  filters: QueueFilters,
  now: Date,
  nameOf: (userId: string) => string
) {
  const search = filters.search.trim().toLowerCase();

  return tickets.filter(
    (ticket) =>
      inView(ticket, filters.view, now) &&
      (filters.priority === null || ticket.priority === filters.priority) &&
      (filters.assigneeId === null ||
        (filters.assigneeId === 'unassigned'
          ? ticket.assigneeId === null
          : ticket.assigneeId === filters.assigneeId)) &&
      [ticket.id, ticket.subject, nameOf(ticket.customerId), ...ticket.tags].some((text) =>
        text.toLowerCase().includes(search)
      )
  );
}

const sortValue: Record<QueueSort['key'], (ticket: Ticket) => number> = {
  priority: (ticket) => PRIORITY_RANK[ticket.priority],
  // Age grows as the creation time shrinks: ascending puts the newest first
  age: (ticket) => -ticket.createdAt.getTime(),
  sla: (ticket) => ticket.slaDueAt.getTime(),
};

/** A sorted copy; ties keep the order they came in */
export function sortTickets(tickets: Ticket[], sort: QueueSort) {
  const value = sortValue[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...tickets].sort((a, b) => sign * (value(a) - value(b)));
}

/** Clicking the sorted column flips its direction; another column starts ascending */
export const nextSort = (sort: QueueSort, key: QueueSort['key']): QueueSort =>
  sort.key === key
    ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' };

/** "45m", "3h", "2d" */
export function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export const formatAge = (ticket: Ticket, now: Date) =>
  formatDuration(now.getTime() - ticket.createdAt.getTime());

export interface SlaState {
  label: string;
  color: string;
}

/** Time to the next answer: red when overdue, orange within an hour; nothing to do when closed */
export function slaState(ticket: Ticket, now: Date): SlaState {
  if (ticket.status === 'closed') {
    return { label: 'Done', color: 'dimmed' };
  }

  const left = ticket.slaDueAt.getTime() - now.getTime();

  if (left < 0) {
    return { label: `Overdue ${formatDuration(left)}`, color: 'red' };
  }

  return { label: `${formatDuration(left)} left`, color: left <= 60 * 60000 ? 'orange' : 'teal' };
}

export const formatDateTime = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Quick choices in the snooze menu */
export function snoozeOptions(now: Date) {
  const at9 = (days: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9, 0);
  // Days until next Monday, 1 to 7
  const toMonday = (8 - now.getDay()) % 7 || 7;

  return [
    { label: 'In 1 hour', until: new Date(now.getTime() + 60 * 60000) },
    { label: 'Tomorrow, 9:00', until: at9(1) },
    { label: 'Next Monday, 9:00', until: at9(toMonday) },
  ];
}

export type QueueAction =
  | { type: 'assign'; ids: string[]; assignee: Agent | null; at: Date }
  | { type: 'setStatus'; ids: string[]; status: TicketStatus; at: Date }
  | { type: 'setPriority'; ids: string[]; priority: TicketPriority; at: Date }
  | { type: 'addTag'; ids: string[]; tag: string; at: Date }
  | { type: 'snooze'; ids: string[]; until: Date | null; at: Date }
  | { type: 'send'; id: string; text: string; note: boolean; at: Date };

/** What the change does to one ticket, and the event it logs; null when there is nothing to do */
function describe(
  ticket: Ticket,
  action: Exclude<QueueAction, { type: 'send' }>
): [Partial<Ticket>, string] | null {
  switch (action.type) {
    case 'assign': {
      const assigneeId = action.assignee?.id ?? null;
      return ticket.assigneeId === assigneeId
        ? null
        : [
            { assigneeId },
            action.assignee
              ? `You assigned this to ${action.assignee.name}`
              : 'You unassigned this',
          ];
    }
    case 'setStatus':
      return ticket.status === action.status
        ? null
        : [{ status: action.status }, `You changed the status to ${STATUS_LABELS[action.status]}`];
    case 'setPriority':
      return ticket.priority === action.priority
        ? null
        : [
            { priority: action.priority },
            `You changed the priority to ${PRIORITY_LABELS[action.priority]}`,
          ];
    case 'addTag':
      return ticket.tags.includes(action.tag)
        ? null
        : [{ tags: [...ticket.tags, action.tag] }, `You tagged this ${action.tag}`];
    default:
      return [
        { snoozedUntil: action.until },
        action.until
          ? `You snoozed this until ${formatDateTime(action.until)}`
          : 'You unsnoozed this',
      ];
  }
}

const nextId = (ticket: Ticket) => `${ticket.id}-${ticket.items.length + 1}`;

/** Changes to tickets; every change logs an event in the ticket's timeline */
export function queueReducer(tickets: Ticket[], action: QueueAction): Ticket[] {
  if (action.type === 'send') {
    return tickets.map((ticket) => {
      if (ticket.id !== action.id) {
        return ticket;
      }

      const message: ChatMessage = {
        id: nextId(ticket),
        authorId: 'me',
        body: action.text,
        createdAt: action.at,
        visibility: action.note ? 'internal' : 'public',
      };
      return { ...ticket, items: [...ticket.items, message] };
    });
  }

  return tickets.map((ticket) => {
    const change = action.ids.includes(ticket.id) ? describe(ticket, action) : null;

    if (!change) {
      return ticket;
    }

    const [patch, text] = change;
    const event: SystemEvent = {
      id: nextId(ticket),
      kind: 'event',
      authorId: 'me',
      text,
      createdAt: action.at,
    };
    return { ...ticket, ...patch, items: [...ticket.items, event] };
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs && npm test`
Expected: exit 0, 100% (`queue.ts` 100% from `queue.test.ts` alone).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Work queue: views, filters, sorting, SLA, snooze choices and the ticket reducer

Every change logs an event in the ticket's timeline.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Triage table, filters and bulk bar

**Files:**
- Create: `docs/demos/WorkQueue/TriageTable.tsx`, `docs/demos/WorkQueue/QueueFilters.tsx`, `docs/demos/WorkQueue/BulkActions.tsx`
- Test: `docs/demos/WorkQueue/TriageTable.test.tsx`

**Interfaces:**
- Consumes: Task 3 `formatAge`, `nameGetter`, `slaState`, labels and colours; Task 2 types and data.
- Produces:
  - `TriageTable(props: { tickets: Ticket[]; users: MessagesUser[]; now: Date; selectedIds: string[]; onSelectedIdsChange: (ids: string[]) => void; sort: QueueSort; onSort: (key: SortKey) => void; onOpen: (id: string) => void })`. Checkboxes are labelled `Select all` and `Select <ticket id>`; the subject is a button that calls `onOpen(id)`; sortable headers are buttons named `Priority`, `Age`, `SLA`.
  - `QueueFilters(props: { filters: QueueFilters; onChange: (filters: QueueFilters) => void; agents: Agent[]; counts: Record<QueueView, number> })`. View radios read `Inbox 10`, `Snoozed 1`, …; search box `aria-label="Search tickets"`; selects with placeholders `Any priority` and `Anyone`.
  - `BulkActions(props: { count: number; agents: Agent[]; tags: string[]; onAssign: (agent: Agent | null) => void; onClose: () => void; onTag: (tag: string) => void; onClear: () => void })`. Buttons `Assign` (menu of agents and `Unassigned`), `Tag` (menu `#<tag>`), `Close tickets`, `Clear selection`.

- [ ] **Step 1: Write the failing test**

Create `docs/demos/WorkQueue/TriageTable.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { agents, createTickets, TAGS, users } from './data';
import { BulkActions } from './BulkActions';
import { QueueFilters } from './QueueFilters';
import { DEFAULT_FILTERS } from './queue';
import { TriageTable, TriageTableProps } from './TriageTable';

const now = new Date(2026, 10, 16, 10, 0);
const tickets = createTickets(now).filter((ticket) =>
  ['T-1042', 'T-1041', 'T-1032'].includes(ticket.id)
);

function renderTable(props: Partial<TriageTableProps> = {}) {
  const handlers = { onSelectedIdsChange: jest.fn(), onSort: jest.fn(), onOpen: jest.fn() };
  render(
    <TriageTable
      tickets={tickets}
      users={users}
      now={now}
      selectedIds={[]}
      sort={{ key: 'sla', direction: 'asc' }}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

const row = (subject: string) => screen.getByRole('button', { name: subject }).closest('tr')!;

describe('TriageTable', () => {
  it('shows status, priority, assignee, age and SLA for each ticket', () => {
    renderTable();
    const nora = within(row('Charged twice for the March invoice'));
    expect(nora.getByText('T-1042 · Nora Feld · #billing')).toBeInTheDocument();
    expect(nora.getByText('Open')).toBeInTheDocument();
    expect(nora.getByText('Urgent')).toBeInTheDocument();
    expect(nora.getByText('Unassigned')).toBeInTheDocument();
    expect(nora.getByText('2h')).toBeInTheDocument();
    expect(nora.getByText('Overdue 20m')).toBeInTheDocument();

    const luis = within(row('Account locked after password reset'));
    expect(luis.getByText('Theo Okafor')).toBeInTheDocument();
    expect(luis.getByText('45m left')).toBeInTheDocument();
    expect(within(row('How do I add a teammate?')).getByText('Done')).toBeInTheDocument();
  });

  it('opens a ticket from its subject', async () => {
    const { onOpen } = renderTable();
    await userEvent.click(
      screen.getByRole('button', { name: 'Account locked after password reset' })
    );
    expect(onOpen).toHaveBeenCalledWith('T-1041');
  });

  it('marks the sorted column and asks to sort by another', async () => {
    const { onSort } = renderTable({ sort: { key: 'priority', direction: 'desc' } });
    expect(screen.getByRole('columnheader', { name: 'Priority' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(screen.getByRole('columnheader', { name: 'SLA' })).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(screen.getByRole('button', { name: 'SLA' }));
    expect(onSort).toHaveBeenCalledWith('sla');
  });

  it('shows the ascending arrow', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'SLA' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

  it('selects one ticket, all of them, or none', async () => {
    const { onSelectedIdsChange } = renderTable({ selectedIds: ['T-1042'] });
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
      'data-indeterminate',
      'true'
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1041' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['T-1042', 'T-1041']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['T-1042', 'T-1041', 'T-1032']);
  });

  it('clears the selection from the header when everything is selected', async () => {
    const { onSelectedIdsChange } = renderTable({ selectedIds: ['T-1042', 'T-1041', 'T-1032'] });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('says when nothing matches', () => {
    renderTable({ tickets: [] });
    expect(screen.getByText('No tickets match')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBeChecked();
  });
});

describe('QueueFilters', () => {
  it('switches views, searches and filters by priority and assignee', async () => {
    const onChange = jest.fn();
    render(
      <QueueFilters
        filters={DEFAULT_FILTERS}
        onChange={onChange}
        agents={agents}
        counts={{ inbox: 10, snoozed: 1, closed: 1, all: 12 }}
      />
    );
    await userEvent.click(screen.getByText('Snoozed 1'));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, view: 'snoozed' });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search tickets' }), 'x');
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, search: 'x' });

    await userEvent.click(screen.getByPlaceholderText('Any priority'));
    await userEvent.click(screen.getByRole('option', { name: 'Urgent' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, priority: 'urgent' });

    await userEvent.click(screen.getByPlaceholderText('Anyone'));
    await userEvent.click(screen.getByRole('option', { name: 'Unassigned' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, assigneeId: 'unassigned' });
  });
});

describe('BulkActions', () => {
  it('assigns, tags, closes and clears the selection', async () => {
    const handlers = {
      onAssign: jest.fn(),
      onClose: jest.fn(),
      onTag: jest.fn(),
      onClear: jest.fn(),
    };
    render(<BulkActions count={2} agents={agents} tags={TAGS} {...handlers} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Maya Lindqvist' }));
    expect(handlers.onAssign).toHaveBeenLastCalledWith(agents[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unassigned' }));
    expect(handlers.onAssign).toHaveBeenLastCalledWith(null);

    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '#vip' }));
    expect(handlers.onTag).toHaveBeenCalledWith('vip');

    await userEvent.click(screen.getByRole('button', { name: 'Close tickets' }));
    expect(handlers.onClose).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(handlers.onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest docs/demos/WorkQueue/TriageTable`
Expected: FAIL, `Cannot find module './BulkActions' from 'docs/demos/WorkQueue/TriageTable.test.tsx'`.

- [ ] **Step 3: Implement**

Create `docs/demos/WorkQueue/TriageTable.tsx`:

```tsx
import { Anchor, Avatar, Badge, Checkbox, Group, Table, Text, UnstyledButton } from '@mantine/core';
import type { MessagesUser } from 'mantine-messages';
import React from 'react';
import {
  formatAge,
  nameGetter,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  slaState,
  STATUS_COLORS,
  STATUS_LABELS,
} from './queue';
import type { QueueSort, SortKey, Ticket } from './types';

export interface TriageTableProps {
  /** Filtered and sorted */
  tickets: Ticket[];
  users: MessagesUser[];
  now: Date;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  sort: QueueSort;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
}

const SORT_LABELS: Record<SortKey, string> = { priority: 'Priority', age: 'Age', sla: 'SLA' };

export function TriageTable({
  tickets,
  users,
  now,
  selectedIds,
  onSelectedIdsChange,
  sort,
  onSort,
  onOpen,
}: TriageTableProps) {
  const nameOf = nameGetter(users);
  const selected = new Set(selectedIds);
  const allSelected = tickets.length > 0 && tickets.every((ticket) => selected.has(ticket.id));

  const toggle = (id: string) =>
    onSelectedIdsChange(
      selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
    );

  const sortable = (key: SortKey) => {
    const active = sort.key === key;
    const arrow = sort.direction === 'asc' ? '▲' : '▼';

    return (
      <Table.Th
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <UnstyledButton fz="sm" fw={700} onClick={() => onSort(key)}>
          {SORT_LABELS[key]} {active && <span aria-hidden>{arrow}</span>}
        </UnstyledButton>
      </Table.Th>
    );
  };

  return (
    <Table highlightOnHover stickyHeader verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Checkbox
              aria-label="Select all"
              checked={allSelected}
              indeterminate={!allSelected && tickets.some((ticket) => selected.has(ticket.id))}
              onChange={() => onSelectedIdsChange(allSelected ? [] : tickets.map((t) => t.id))}
            />
          </Table.Th>
          <Table.Th>Ticket</Table.Th>
          <Table.Th>Status</Table.Th>
          {sortable('priority')}
          <Table.Th>Assignee</Table.Th>
          {sortable('age')}
          {sortable('sla')}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {tickets.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={7}>
              <Text c="dimmed" ta="center" py="xl">
                No tickets match
              </Text>
            </Table.Td>
          </Table.Tr>
        )}
        {tickets.map((ticket) => {
          const sla = slaState(ticket, now);

          return (
            <Table.Tr
              key={ticket.id}
              bg={selected.has(ticket.id) ? 'var(--mantine-primary-color-light)' : undefined}
            >
              <Table.Td>
                <Checkbox
                  aria-label={`Select ${ticket.id}`}
                  checked={selected.has(ticket.id)}
                  onChange={() => toggle(ticket.id)}
                />
              </Table.Td>
              <Table.Td>
                <Anchor
                  component="button"
                  type="button"
                  fw={600}
                  fz="sm"
                  onClick={() => onOpen(ticket.id)}
                >
                  {ticket.subject}
                </Anchor>
                <Text size="xs" c="dimmed">
                  {ticket.id} · {nameOf(ticket.customerId)}
                  {ticket.tags.map((tag) => ` · #${tag}`).join('')}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={STATUS_COLORS[ticket.status]}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge variant="dot" color={PRIORITY_COLORS[ticket.priority]}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </Table.Td>
              <Table.Td>
                {ticket.assigneeId ? (
                  <Group gap={6} wrap="nowrap">
                    <Avatar size={22} name={nameOf(ticket.assigneeId)} />
                    <Text size="sm">{nameOf(ticket.assigneeId)}</Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    Unassigned
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatAge(ticket, now)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500} c={sla.color}>
                  {sla.label}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

Create `docs/demos/WorkQueue/QueueFilters.tsx`:

```tsx
import { Group, SegmentedControl, Select, TextInput } from '@mantine/core';
import React from 'react';
import { PRIORITY_LABELS } from './queue';
import type { Agent, QueueFilters as Filters, QueueView, TicketPriority } from './types';

export interface QueueFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  agents: Agent[];

  /** Tickets in each view, shown in the view switch */
  counts: Record<QueueView, number>;
}

const VIEWS: { value: QueueView; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

export function QueueFilters({ filters, onChange, agents, counts }: QueueFiltersProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <Group gap="sm" wrap="wrap">
      <SegmentedControl
        size="xs"
        aria-label="View"
        value={filters.view}
        onChange={(view) => set({ view: view as QueueView })}
        data={VIEWS.map((view) => ({
          value: view.value,
          label: `${view.label} ${counts[view.value]}`,
        }))}
      />
      <TextInput
        size="xs"
        aria-label="Search tickets"
        placeholder="Search id, subject, customer, tag"
        value={filters.search}
        onChange={(event) => set({ search: event.currentTarget.value })}
        style={{ flex: 1, minWidth: 180 }}
      />
      <Select
        size="xs"
        w={140}
        aria-label="Priority"
        placeholder="Any priority"
        clearable
        data={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
        value={filters.priority}
        onChange={(priority) => set({ priority: priority as TicketPriority | null })}
      />
      <Select
        size="xs"
        w={160}
        aria-label="Assignee"
        placeholder="Anyone"
        clearable
        data={[
          { value: 'unassigned', label: 'Unassigned' },
          ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
        ]}
        value={filters.assigneeId}
        onChange={(assigneeId) => set({ assigneeId })}
      />
    </Group>
  );
}
```

Create `docs/demos/WorkQueue/BulkActions.tsx`:

```tsx
import { Button, Group, Menu, Text } from '@mantine/core';
import React from 'react';
import type { Agent } from './types';

export interface BulkActionsProps {
  count: number;
  agents: Agent[];
  tags: string[];
  onAssign: (agent: Agent | null) => void;
  onClose: () => void;
  onTag: (tag: string) => void;
  onClear: () => void;
}

/** Shown while tickets are selected: assign, close or tag them all at once */
export function BulkActions({
  count,
  agents,
  tags,
  onAssign,
  onClose,
  onTag,
  onClear,
}: BulkActionsProps) {
  return (
    <Group gap="xs" px="sm" py={6} bg="var(--mantine-primary-color-light)">
      <Text size="sm" fw={600} mr="auto">
        {count} selected
      </Text>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button size="compact-sm" variant="default">
            Assign
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {agents.map((agent) => (
            <Menu.Item key={agent.id} onClick={() => onAssign(agent)}>
              {agent.name}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item onClick={() => onAssign(null)}>Unassigned</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button size="compact-sm" variant="default">
            Tag
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {tags.map((tag) => (
            <Menu.Item key={tag} onClick={() => onTag(tag)}>
              #{tag}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Button size="compact-sm" variant="default" onClick={onClose}>
        Close tickets
      </Button>
      <Button size="compact-sm" variant="subtle" onClick={onClear}>
        Clear selection
      </Button>
    </Group>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs && npm test`
Expected: exit 0, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Work queue: triage table with sorting and selection, filters, and a bulk bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mixed timeline, email card and email modal

**Files:**
- Create: `docs/demos/WorkQueue/TicketTimeline.tsx`, `docs/demos/WorkQueue/EmailCard.tsx`, `docs/demos/WorkQueue/EmailModal.tsx`
- Test: `docs/demos/WorkQueue/TicketTimeline.test.tsx`

**Interfaces:**
- Consumes: Task 1 `controlRef` and `MessageListControl` (run `npm run build` after Task 1 is merged, so `tsc` sees them in `package/dist`); `Message`, `MessageList`, `truncate` from `'mantine-messages'`; Task 3 `nameGetter`, `formatDateTime`.
- Produces:
  - `TicketTimeline(props: { items: TimelineItem[]; users: MessagesUser[]; controlRef?: React.Ref<MessageListControl>; onOpenEmail: (email: EmailItem) => void })`: a `MessageList` (`role="log"`); each item is wrapped in a `Box` with `data-highlighted` while flashed; notes carry `data-note` on their `Message` root; events read `<text> · <time>`.
  - `EmailCard(props: { email: EmailItem; time: string; onOpen: (email: EmailItem) => void })`: subject button named `Open email: <subject>`.
  - `EmailModal(props: { email: EmailItem | null; onClose: () => void })`: dialog named by the subject, close button `Close email`.
  - `EmailBody(props: { email: EmailItem })`: the phase 5 seam.

- [ ] **Step 1: Write the failing test**

Create `docs/demos/WorkQueue/TicketTimeline.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MessageListControl } from 'mantine-messages';
import React, { useState } from 'react';
import { createTickets, users } from './data';
import { EmailModal } from './EmailModal';
import { TicketTimeline } from './TicketTimeline';
import type { EmailItem } from './types';

const now = new Date(2026, 10, 16, 10, 0);
const ticket = createTickets(now).find((item) => item.id === 'T-1042')!;
const email = ticket.items[0] as EmailItem;

describe('TicketTimeline', () => {
  it('mixes an email card, an event, an internal note and a chat message', () => {
    render(<TicketTimeline items={ticket.items} users={users} onOpenEmail={jest.fn()} />);
    expect(screen.getByRole('log')).toBeInTheDocument();

    expect(screen.getByText('<nora@brightloop.example>')).toBeInTheDocument();
    expect(screen.getByText('To: support@lumen.example')).toBeInTheDocument();
    expect(screen.getByText(/^Hi, Our card was charged twice/)).toBeInTheDocument();

    expect(screen.getByText(/^Ticket created from email ·/)).toBeInTheDocument();

    const note = screen.getByText(/Stripe shows two captures/).closest('[data-note]');
    expect(note).toHaveTextContent('Maya Lindqvist');
    expect(note).toHaveTextContent('Internal note');

    const chat = screen.getByText(/following up on my email/).closest('.mantine-Message-root');
    expect(chat).not.toHaveAttribute('data-note');
    expect(chat).toHaveTextContent(/Nora Feld\s*Chat ·/);
  });

  it('opens an email from its card', async () => {
    const onOpenEmail = jest.fn();
    render(<TicketTimeline items={ticket.items} users={users} onOpenEmail={onOpenEmail} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Open email: Charged twice for the March invoice' })
    );
    expect(onOpenEmail).toHaveBeenCalledWith(email);
  });

  it('jumps to an item and flashes it through controlRef', () => {
    const control = React.createRef<MessageListControl>();
    render(
      <TicketTimeline
        items={ticket.items}
        users={users}
        controlRef={control}
        onOpenEmail={jest.fn()}
      />
    );
    const event = () => screen.getByText(/^Ticket created from email/).parentElement!;
    expect(event()).not.toHaveAttribute('data-highlighted');
    act(() => control.current!.jumpTo('T-1042-2'));
    expect(event()).toHaveAttribute('data-highlighted');
  });
});

describe('EmailModal', () => {
  function Harness({ initial }: { initial: EmailItem }) {
    const [open, setOpen] = useState<EmailItem | null>(initial);
    return <EmailModal email={open} onClose={() => setOpen(null)} />;
  }

  it('shows the headers and the plain-text body, and closes', async () => {
    render(<Harness initial={email} />);
    const dialog = screen.getByRole('dialog', { name: 'Charged twice for the March invoice' });
    expect(dialog).toHaveTextContent('FromNora Feld <nora@brightloop.example>');
    expect(dialog).toHaveTextContent('Tosupport@lumen.example');
    expect(dialog).toHaveTextContent('Ccap@brightloop.example');
    expect(dialog).toHaveTextContent('Date');
    expect(screen.getByText(/Finance, Brightloop/)).toHaveStyle({ whiteSpace: 'pre-wrap' });

    await userEvent.click(screen.getByRole('button', { name: 'Close email' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves out Cc when there is none', () => {
    const reply = createTickets(now)
      .find((item) => item.id === 'T-1040')!
      .items.find((item) => 'kind' in item && item.kind === 'email') as EmailItem;
    render(<EmailModal email={reply} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Cc');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest docs/demos/WorkQueue/TicketTimeline`
Expected: FAIL, `Cannot find module './EmailModal' from 'docs/demos/WorkQueue/TicketTimeline.test.tsx'`.

- [ ] **Step 3: Implement**

Create `docs/demos/WorkQueue/EmailCard.tsx`:

```tsx
import { Anchor, Group, Paper, Text } from '@mantine/core';
import { truncate } from 'mantine-messages';
import React from 'react';
import type { EmailItem } from './types';

export interface EmailCardProps {
  email: EmailItem;
  time: string;
  onOpen: (email: EmailItem) => void;
}

/** An email in the timeline: who it is from and to, the subject and the start of the text */
export function EmailCard({ email, time, onOpen }: EmailCardProps) {
  return (
    <Paper withBorder radius="md" p="sm" maw={560}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" truncate>
          <Text component="span" inherit fw={700}>
            {email.from.name}
          </Text>{' '}
          <Text component="span" inherit c="dimmed">
            &lt;{email.from.address}&gt;
          </Text>
        </Text>
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          Email · {time}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" truncate>
        To: {email.to.join(', ')}
      </Text>
      <Anchor
        component="button"
        type="button"
        fw={600}
        fz="sm"
        mt={6}
        ta="left"
        aria-label={`Open email: ${email.subject}`}
        onClick={() => onOpen(email)}
      >
        {email.subject}
      </Anchor>
      <Text size="sm" c="dimmed" lineClamp={2}>
        {truncate(email.text.replace(/\s+/g, ' '), 200)}
      </Text>
    </Paper>
  );
}
```

Create `docs/demos/WorkQueue/EmailModal.tsx`:

```tsx
import { Divider, Modal, Stack, Text } from '@mantine/core';
import React from 'react';
import { formatDateTime } from './queue';
import type { EmailItem } from './types';

export interface EmailModalProps {
  /** The email to show; null closes the modal */
  email: EmailItem | null;
  onClose: () => void;
}

function Header({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Text size="sm">
      <Text component="span" inherit c="dimmed" w={48} display="inline-block">
        {label}
      </Text>
      {children}
    </Text>
  );
}

/**
 * The body of an opened email, as plain text. This is the seam for phase 5: it becomes the email
 * renderer of mantine-doc-viewer (HTML in a sandboxed iframe, remote images blocked until allowed)
 */
export function EmailBody({ email }: { email: EmailItem }) {
  return (
    <Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {email.text}
    </Text>
  );
}

/** The full email: headers, then the body */
export function EmailModal({ email, onClose }: EmailModalProps) {
  return (
    <Modal
      opened={email !== null}
      onClose={onClose}
      title={email?.subject}
      size="lg"
      closeButtonProps={{ 'aria-label': 'Close email' }}
    >
      {email && (
        <>
          <Stack gap={2}>
            <Header label="From">
              {email.from.name} &lt;{email.from.address}&gt;
            </Header>
            <Header label="To">{email.to.join(', ')}</Header>
            {email.cc && <Header label="Cc">{email.cc.join(', ')}</Header>}
            <Header label="Date">{formatDateTime(new Date(email.createdAt))}</Header>
          </Stack>
          <Divider my="sm" />
          <EmailBody email={email} />
        </>
      )}
    </Modal>
  );
}
```

Create `docs/demos/WorkQueue/TicketTimeline.tsx`:

```tsx
import { Box, Text } from '@mantine/core';
import {
  Message,
  MessageList,
  type ChatMessage,
  type MessageListControl,
  type MessagesUser,
} from 'mantine-messages';
import React from 'react';
import { EmailCard } from './EmailCard';
import { nameGetter } from './queue';
import type { EmailItem, TimelineItem } from './types';

export interface TicketTimelineProps {
  items: TimelineItem[];
  users: MessagesUser[];

  /** Lets the ticket sidebar jump to an item and flash it */
  controlRef?: React.Ref<MessageListControl>;
  onOpenEmail: (email: EmailItem) => void;
}

const time = (item: TimelineItem) =>
  new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Emails, chat, internal notes and events of one ticket, in one list */
export function TicketTimeline({ items, users, controlRef, onOpenEmail }: TicketTimelineProps) {
  const nameOf = nameGetter(users);

  const renderMessage = (message: ChatMessage) => {
    const note = message.visibility === 'internal';

    return (
      <Message
        p="xs"
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          ...(note && {
            backgroundColor: 'var(--mantine-color-yellow-light)',
            boxShadow: 'inset 3px 0 0 var(--mantine-color-yellow-filled)',
          }),
        }}
        mod={{ note }}
      >
        <Message.Avatar name={nameOf(message.authorId)} />
        <Message.Body>
          <Message.Meta>
            <Text component="span" size="sm" fw={700}>
              {nameOf(message.authorId)}
            </Text>
            <Text component="span" size="xs" c="dimmed">
              {note ? 'Internal note' : 'Chat'} · {time(message)}
            </Text>
          </Message.Meta>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.body}
          </Text>
        </Message.Body>
      </Message>
    );
  };

  const renderItem = (item: TimelineItem) => {
    if (!('kind' in item)) {
      return renderMessage(item);
    }

    if (item.kind === 'email') {
      return <EmailCard email={item} time={time(item)} onOpen={onOpenEmail} />;
    }

    return (
      <Text size="xs" c="dimmed" ta="center">
        {item.text} · {time(item)}
      </Text>
    );
  };

  return (
    <MessageList<TimelineItem>
      items={items}
      controlRef={controlRef}
      isOwn={(item) => item.authorId === 'me'}
      style={{ flex: 1, minHeight: 0 }}
      renderItem={(item, { highlighted }) => (
        <Box
          py={4}
          px="md"
          mod={{ highlighted }}
          style={{
            transition: 'background-color 300ms',
            backgroundColor: highlighted ? 'var(--mantine-primary-color-light)' : undefined,
          }}
        >
          {renderItem(item)}
        </Box>
      )}
    />
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs && npm run build && npm test`
Expected: exit 0, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Work queue: one timeline per ticket mixing email cards, chat, notes and events

Emails open in a Modal; EmailBody is where phase 5 plugs in the doc viewer.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ticket sidebar: assign, status, priority, snooze, Activity

**Files:**
- Create: `docs/demos/WorkQueue/TicketSidebar.tsx`
- Test: `docs/demos/WorkQueue/TicketSidebar.test.tsx`

**Interfaces:**
- Consumes: Task 3 `QueueAction`, `formatDateTime`, `isSnoozed`, `snoozeOptions`, labels; Task 2 types and data.
- Produces: `TicketSidebar(props: { ticket: Ticket; agents: Agent[]; now: Date; dispatch: (action: QueueAction) => void; onJumpTo: (id: string) => void })`. Selects labelled `Assignee` (clear button `aria-label="Unassign"`), `Status`, `Priority`; `Snooze…` opens a popover with the three quick choices, an `Until` `datetime-local` input and `Snooze until then`; a snoozed ticket shows `Snoozed until …` and `Unsnooze`; tags as `#tag` badges; each event of the ticket is a button that calls `onJumpTo(event.id)`. Every action carries `at: new Date()`.

- [ ] **Step 1: Write the failing test**

Create `docs/demos/WorkQueue/TicketSidebar.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { agents, createTickets } from './data';
import { TicketSidebar } from './TicketSidebar';
import type { Ticket } from './types';

// A Monday
const now = new Date(2026, 10, 16, 10, 0);
const ticketById = (id: string) => createTickets(now).find((ticket) => ticket.id === id)!;

function renderSidebar(ticket: Ticket) {
  const dispatch = jest.fn();
  const onJumpTo = jest.fn();
  render(
    <TicketSidebar
      ticket={ticket}
      agents={agents}
      now={now}
      dispatch={dispatch}
      onJumpTo={onJumpTo}
    />
  );
  return { dispatch, onJumpTo };
}

const pick = async (label: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(screen.getByRole('option', { name: option }));
};

describe('TicketSidebar', () => {
  it('assigns, changes status and priority of this ticket', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    await pick('Assignee', 'Maya Lindqvist');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'assign', ids: ['T-1042'], assignee: agents[1] })
    );
    await pick('Status', 'Pending');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'setStatus', ids: ['T-1042'], status: 'pending' })
    );
    await pick('Priority', 'Low');
    expect(dispatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'setPriority', ids: ['T-1042'], priority: 'low' })
    );
  });

  it('unassigns with the clear button; shows no tags when there are none', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1041'));
    expect(screen.queryByText(/^#/)).toBeNull();
    // Mantine renders the clear button aria-hidden, so find it by its label
    await userEvent.click(document.querySelector('[aria-label="Unassign"]')!);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'assign', assignee: null })
    );
  });

  it('snoozes with a quick choice, and closes the menu', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    expect(screen.getByText('#billing')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tomorrow, 9:00' }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snooze',
        ids: ['T-1042'],
        until: new Date(2026, 10, 17, 9, 0),
      })
    );
    expect(screen.queryByRole('button', { name: 'Tomorrow, 9:00' })).toBeNull();
  });

  it('snoozes until a date and time, only in the future', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1042'));
    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    const until = screen.getByLabelText('Until');
    const submit = screen.getByRole('button', { name: 'Snooze until then' });
    expect(submit).toBeDisabled();

    await userEvent.type(until, '2026-11-15T09:00');
    expect(submit).toBeDisabled();

    await userEvent.clear(until);
    await userEvent.type(until, '2026-11-20T14:30');
    await userEvent.click(submit);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'snooze', until: new Date(2026, 10, 20, 14, 30) })
    );
  });

  it('shows when a ticket is snoozed and unsnoozes it', async () => {
    const { dispatch } = renderSidebar(ticketById('T-1034'));
    expect(screen.getByText(/^Snoozed until/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unsnooze' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'snooze', until: null }));
  });

  it('lists the events and jumps to one', async () => {
    const { onJumpTo } = renderSidebar(ticketById('T-1041'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Maya Lindqvist assigned this to Theo Okafor' })
    );
    expect(onJumpTo).toHaveBeenCalledWith('T-1041-2');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest docs/demos/WorkQueue/TicketSidebar`
Expected: FAIL, `Cannot find module './TicketSidebar' from 'docs/demos/WorkQueue/TicketSidebar.test.tsx'`.

- [ ] **Step 3: Implement**

Create `docs/demos/WorkQueue/TicketSidebar.tsx`:

```tsx
import {
  Badge,
  Button,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import type { SystemEvent } from 'mantine-messages';
import React, { useState } from 'react';
import {
  formatDateTime,
  isSnoozed,
  PRIORITY_LABELS,
  type QueueAction,
  snoozeOptions,
  STATUS_LABELS,
} from './queue';
import type { Agent, Ticket, TicketPriority, TicketStatus } from './types';

export interface TicketSidebarProps {
  ticket: Ticket;
  agents: Agent[];
  now: Date;
  dispatch: (action: QueueAction) => void;

  /** Scrolls the timeline to an item and flashes it */
  onJumpTo: (id: string) => void;
}

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Assign, status, priority, snooze, tags, and the ticket's activity as links into the timeline */
export function TicketSidebar({ ticket, agents, now, dispatch, onJumpTo }: TicketSidebarProps) {
  const [custom, setCustom] = useState('');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const ids = [ticket.id];
  const at = () => new Date();
  const customDate = custom ? new Date(custom) : null;
  const events = ticket.items.filter(
    (item): item is SystemEvent => 'kind' in item && item.kind === 'event'
  );

  const snooze = (until: Date | null) => {
    dispatch({ type: 'snooze', ids, until, at: at() });
    setSnoozeOpen(false);
  };

  return (
    <Stack gap="sm" p="md" w={260} style={{ overflowY: 'auto' }}>
      <Select
        label="Assignee"
        placeholder="Unassigned"
        clearable
        clearButtonProps={{ 'aria-label': 'Unassign' }}
        data={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
        value={ticket.assigneeId}
        onChange={(id) =>
          dispatch({
            type: 'assign',
            ids,
            assignee: agents.find((agent) => agent.id === id) ?? null,
            at: at(),
          })
        }
      />
      <Select
        label="Status"
        allowDeselect={false}
        data={options(STATUS_LABELS)}
        value={ticket.status}
        onChange={(status) =>
          dispatch({ type: 'setStatus', ids, status: status as TicketStatus, at: at() })
        }
      />
      <Select
        label="Priority"
        allowDeselect={false}
        data={options(PRIORITY_LABELS)}
        value={ticket.priority}
        onChange={(priority) =>
          dispatch({ type: 'setPriority', ids, priority: priority as TicketPriority, at: at() })
        }
      />

      {isSnoozed(ticket, now) ? (
        <Group justify="space-between" gap="xs">
          <Text size="sm">Snoozed until {formatDateTime(ticket.snoozedUntil!)}</Text>
          <Button size="compact-sm" variant="default" onClick={() => snooze(null)}>
            Unsnooze
          </Button>
        </Group>
      ) : (
        <Popover opened={snoozeOpen} onChange={setSnoozeOpen} position="bottom-start" width={240}>
          <Popover.Target>
            <Button variant="default" size="sm" onClick={() => setSnoozeOpen((o) => !o)}>
              Snooze…
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              {snoozeOptions(now).map((option) => (
                <Button
                  key={option.label}
                  variant="subtle"
                  justify="flex-start"
                  onClick={() => snooze(option.until)}
                >
                  {option.label}
                </Button>
              ))}
              <TextInput
                type="datetime-local"
                label="Until"
                value={custom}
                onChange={(event) => setCustom(event.currentTarget.value)}
              />
              <Button
                disabled={!customDate || customDate <= now}
                onClick={() => snooze(customDate)}
              >
                Snooze until then
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}

      {ticket.tags.length > 0 && (
        <Group gap={4}>
          {ticket.tags.map((tag) => (
            <Badge key={tag} variant="light" color="gray">
              #{tag}
            </Badge>
          ))}
        </Group>
      )}

      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="sm">
        Activity
      </Text>
      {events.map((event) => (
        <UnstyledButton key={event.id} fz="xs" onClick={() => onJumpTo(event.id)}>
          {event.text}
        </UnstyledButton>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs && npm test`
Expected: exit 0, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Work queue: ticket sidebar with assign, status, priority, snooze and activity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ticket view and the app shell

**Files:**
- Create: `docs/demos/WorkQueue/TicketView.tsx`, `docs/demos/WorkQueue/WorkQueue.tsx`
- Test: `docs/demos/WorkQueue/TicketView.test.tsx`, `docs/demos/WorkQueue/WorkQueue.test.tsx`

**Interfaces:**
- Consumes: Tasks 3 to 6 (`queueReducer`, `filterTickets`, `sortTickets`, `nextSort`, `countByView`, `DEFAULT_FILTERS`, `TriageTable`, `QueueFilters`, `BulkActions`, `TicketTimeline`, `EmailModal`, `TicketSidebar`); `Composer`, `ComposerDraft`, `ComposerMode`, `MessageListControl` from `'mantine-messages'`.
- Produces:
  - `TicketView(props: { ticket: Ticket; users: MessagesUser[]; agents: Agent[]; now: Date; dispatch: (action: QueueAction) => void; onBack: () => void })`: header (`← Queue`, subject, `<id> · <customer>`, status badge), `TicketTimeline` with a `controlRef`, `Composer` with modes `reply` (placeholder `Reply to the customer`) and `note` (`Internal note`, yellow, `note: true`, placeholder `Only your team sees notes`), `TicketSidebar` whose `onJumpTo` calls `controlRef.current!.jumpTo(id)`, and `EmailModal`.
  - `WorkQueue(props: { now?: Date; defaultTicketId?: string; h?: number | string })`, `h` 640 by default: state with `useReducer(queueReducer, now, createTickets)`, filters, sort (`sla` ascending), selection, open ticket.

- [ ] **Step 1: Write the failing tests**

Create `docs/demos/WorkQueue/TicketView.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React, { useReducer } from 'react';
import { agents, createTickets, users } from './data';
import { queueReducer } from './queue';
import { TicketView } from './TicketView';
import type { Ticket } from './types';

const now = new Date(2026, 10, 16, 10, 0);
const ticketById = (id: string) => createTickets(now).find((ticket) => ticket.id === id)!;

/** TicketView over the real reducer, so actions show up in the ticket */
function Harness({ initial, onBack = () => {} }: { initial: Ticket; onBack?: () => void }) {
  const [tickets, dispatch] = useReducer(queueReducer, [initial]);
  return (
    <TicketView
      ticket={tickets[0]}
      users={users}
      agents={agents}
      now={now}
      dispatch={dispatch}
      onBack={onBack}
    />
  );
}

describe('TicketView', () => {
  it('shows the subject, id, customer and status, and goes back to the queue', async () => {
    const onBack = jest.fn();
    render(<Harness initial={ticketById('T-1042')} onBack={onBack} />);
    expect(
      screen.getByText('Charged twice for the March invoice', { selector: 'p' })
    ).toBeInTheDocument();
    expect(screen.getByText('T-1042 · Nora Feld')).toBeInTheDocument();
    expect(screen.getByText('Open', { selector: '.mantine-Badge-label' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Queue' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('sends a public reply, or an internal note in Note mode', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.type(
      screen.getByPlaceholderText('Reply to the customer'),
      'Refund is on its way{Enter}'
    );
    expect(screen.getByText('Refund is on its way').closest('[data-note]')).toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: 'Internal note' }));
    await userEvent.type(
      screen.getByPlaceholderText('Only your team sees notes'),
      'Refunded in Stripe{Enter}'
    );
    expect(screen.getByText('Refunded in Stripe').closest('[data-note]')).toBeInTheDocument();
  });

  it('opens an email card in a modal and closes it', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Open email: Charged twice for the March invoice' })
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Finance, Brightloop');
    await userEvent.click(screen.getByRole('button', { name: 'Close email' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('logs a change in the timeline and the activity list', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Priority' }));
    await userEvent.click(screen.getByRole('option', { name: 'Low' }));
    expect(
      screen.getByRole('button', { name: 'You changed the priority to Low' })
    ).toBeInTheDocument();
    expect(screen.getByText(/^You changed the priority to Low ·/)).toBeInTheDocument();
  });

  it('jumps to an event in the timeline from the activity list, and flashes it', async () => {
    render(<Harness initial={ticketById('T-1042')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ticket created from email' }));
    expect(screen.getByText(/^Ticket created from email ·/).parentElement).toHaveAttribute(
      'data-highlighted'
    );
  });
});
```

Create `docs/demos/WorkQueue/WorkQueue.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkQueue } from './WorkQueue';

const now = new Date(2026, 10, 16, 10, 0);
const subjects = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryAllByRole('button')[0]?.textContent);

describe('WorkQueue', () => {
  it('lists the inbox by SLA, most urgent first, and re-sorts by priority', async () => {
    render(<WorkQueue now={now} />);
    expect(screen.getByText('Inbox 10')).toBeInTheDocument();
    expect(subjects().slice(0, 3)).toEqual([
      'Android app crashes on launch',
      'Charged twice for the March invoice',
      'Webhook deliveries failing with 410',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Priority' }));
    expect(subjects().slice(0, 2)).toEqual([
      'Charged twice for the March invoice',
      'Webhook deliveries failing with 410',
    ]);
  });

  it('searches and switches to snoozed tickets', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search tickets' }), 'okta');
    expect(subjects()).toEqual(['SSO setup with Okta']);
    await userEvent.clear(screen.getByRole('textbox', { name: 'Search tickets' }));
    await userEvent.click(screen.getByText('Snoozed 1'));
    expect(subjects()).toEqual(['Change of invoice address']);
  });

  it('closes, assigns and tags the selected tickets, then clears the selection', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1039' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Priya Raman' }));
    expect(screen.queryByText('2 selected')).toBeNull();
    expect(screen.getAllByText('Priya Raman').length).toBeGreaterThanOrEqual(3);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '#vip' }));
    expect(screen.getByText('T-1042 · Nora Feld · #billing · #vip')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close tickets' }));
    expect(screen.getByText('Inbox 9')).toBeInTheDocument();
    expect(screen.getByText('Closed 2')).toBeInTheDocument();
    expect(subjects()).not.toContain('Charged twice for the March invoice');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1041' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('clears the selection when the filters change', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select T-1042' }));
    await userEvent.click(screen.getByText('All 12'));
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('opens a ticket, snoozes it out of the inbox, and goes back', async () => {
    render(<WorkQueue now={now} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Charged twice for the March invoice' })
    );
    expect(screen.getByRole('log')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Snooze…' }));
    await userEvent.click(screen.getByRole('button', { name: 'In 1 hour' }));
    expect(screen.getByText(/^Snoozed until/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '← Queue' }));
    expect(screen.getByText('Inbox 9')).toBeInTheDocument();
    expect(screen.getByText('Snoozed 2')).toBeInTheDocument();
  });

  it('opens on a ticket when asked, with the clock of the first render by default', () => {
    render(<WorkQueue defaultTicketId="T-1038" h={500} />);
    expect(screen.getByText('T-1038 · Fatima Zahra')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest docs/demos/WorkQueue/TicketView docs/demos/WorkQueue/WorkQueue`
Expected: both FAIL, `Cannot find module './TicketView'` and `Cannot find module './WorkQueue'`.

- [ ] **Step 3: Implement**

Create `docs/demos/WorkQueue/TicketView.tsx`:

```tsx
import { Badge, Box, Button, Group, Text } from '@mantine/core';
import {
  Composer,
  type ComposerDraft,
  type ComposerMode,
  type MessageListControl,
  type MessagesUser,
} from 'mantine-messages';
import React, { useRef, useState } from 'react';
import { EmailModal } from './EmailModal';
import { nameGetter, type QueueAction, STATUS_COLORS, STATUS_LABELS } from './queue';
import { TicketSidebar } from './TicketSidebar';
import { TicketTimeline } from './TicketTimeline';
import type { Agent, EmailItem, Ticket } from './types';

export interface TicketViewProps {
  ticket: Ticket;
  users: MessagesUser[];
  agents: Agent[];
  now: Date;
  dispatch: (action: QueueAction) => void;
  onBack: () => void;
}

const MODES: ComposerMode[] = [
  { value: 'reply', label: 'Reply', placeholder: 'Reply to the customer' },
  {
    value: 'note',
    label: 'Internal note',
    color: 'yellow',
    note: true,
    placeholder: 'Only your team sees notes',
  },
];

/** One ticket: its timeline and composer, with the actions beside them */
export function TicketView({ ticket, users, agents, now, dispatch, onBack }: TicketViewProps) {
  const timeline = useRef<MessageListControl>(null);
  const [email, setEmail] = useState<EmailItem | null>(null);
  const nameOf = nameGetter(users);

  const send = ({ text, mode }: ComposerDraft) =>
    dispatch({ type: 'send', id: ticket.id, text, note: mode === 'note', at: new Date() });

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Group
        gap="sm"
        px="md"
        py="xs"
        wrap="nowrap"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Button variant="subtle" size="compact-sm" onClick={onBack}>
          ← Queue
        </Button>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700} truncate>
            {ticket.subject}
          </Text>
          <Text size="xs" c="dimmed">
            {ticket.id} · {nameOf(ticket.customerId)}
          </Text>
        </Box>
        <Badge variant="light" color={STATUS_COLORS[ticket.status]}>
          {STATUS_LABELS[ticket.status]}
        </Badge>
      </Group>
      <Box style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <TicketTimeline
            items={ticket.items}
            users={users}
            controlRef={timeline}
            onOpenEmail={setEmail}
          />
          <Composer m="sm" modes={MODES} onSend={send} />
        </Box>
        <Box
          style={{ borderLeft: '1px solid var(--mantine-color-default-border)', display: 'flex' }}
        >
          <TicketSidebar
            ticket={ticket}
            agents={agents}
            now={now}
            dispatch={dispatch}
            onJumpTo={(id) => timeline.current!.jumpTo(id)}
          />
        </Box>
      </Box>
      <EmailModal email={email} onClose={() => setEmail(null)} />
    </Box>
  );
}
```

Create `docs/demos/WorkQueue/WorkQueue.tsx`:

```tsx
import { Box, Paper, ScrollArea } from '@mantine/core';
import React, { useMemo, useReducer, useState } from 'react';
import { BulkActions } from './BulkActions';
import { agents, createTickets, TAGS, users } from './data';
import { QueueFilters } from './QueueFilters';
import {
  countByView,
  DEFAULT_FILTERS,
  filterTickets,
  nameGetter,
  nextSort,
  type QueueAction,
  queueReducer,
  sortTickets,
} from './queue';
import { TicketView } from './TicketView';
import { TriageTable } from './TriageTable';
import type { QueueFilters as Filters, QueueSort } from './types';

export interface WorkQueueProps {
  /** The clock for ages, SLAs and snoozing, the time of the first render by default */
  now?: Date;

  /** Ticket open at first; the queue shows when it is missing */
  defaultTicketId?: string;

  /** Height of the app, 640 by default */
  h?: number | string;
}

const nameOf = nameGetter(users);

/**
 * A support work queue built from mantine-messages: a triage table, and a ticket with its mixed
 * timeline, a Reply / Internal note composer and actions
 */
export function WorkQueue({ now: nowProp, defaultTicketId, h = 640 }: WorkQueueProps) {
  const [now] = useState(() => nowProp ?? new Date());
  const [tickets, dispatch] = useReducer(queueReducer, now, createTickets);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<QueueSort>({ key: 'sla', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(defaultTicketId ?? null);

  const visible = useMemo(
    () => sortTickets(filterTickets(tickets, filters, now, nameOf), sort),
    [tickets, filters, now, sort]
  );
  const open = tickets.find((ticket) => ticket.id === openId);

  // A bulk action applies to the selection, which then clears
  const bulk = (action: QueueAction) => {
    dispatch(action);
    setSelectedIds([]);
  };
  const at = () => new Date();

  return (
    <Paper
      withBorder
      radius="lg"
      h={h}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {open ? (
        <TicketView
          ticket={open}
          users={users}
          agents={agents}
          now={now}
          dispatch={dispatch}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <QueueFilters
              filters={filters}
              onChange={(next) => {
                setFilters(next);
                setSelectedIds([]);
              }}
              agents={agents}
              counts={countByView(tickets, now)}
            />
          </Box>
          {selectedIds.length > 0 && (
            <BulkActions
              count={selectedIds.length}
              agents={agents}
              tags={TAGS}
              onAssign={(assignee) =>
                bulk({ type: 'assign', ids: selectedIds, assignee, at: at() })
              }
              onClose={() =>
                bulk({ type: 'setStatus', ids: selectedIds, status: 'closed', at: at() })
              }
              onTag={(tag) => bulk({ type: 'addTag', ids: selectedIds, tag, at: at() })}
              onClear={() => setSelectedIds([])}
            />
          )}
          <ScrollArea style={{ flex: 1 }}>
            <TriageTable
              tickets={visible}
              users={users}
              now={now}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              sort={sort}
              onSort={(key) => setSort((current) => nextSort(current, key))}
              onOpen={setOpenId}
            />
          </ScrollArea>
        </>
      )}
    </Paper>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write docs && npm run build && npm test`
Expected: exit 0, 100% (the coverage table lists all eleven example files at 100%).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Work queue: ticket view with Reply and Internal note, and the app shell

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Story, docs demo, docs section and changelog

**Files:**
- Create: `package/src/WorkQueue.story.tsx`, `docs/demos/WorkQueue.demo.tsx`
- Modify: `docs/demos/index.ts`, `docs/docs.mdx`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `WorkQueue` (Task 7); the Storybook alias (Task 2).
- Produces: stories `work-queue--queue` and `work-queue--open-ticket`; `demos.workQueue`; a "Work queue (example)" docs section.

- [ ] **Step 1: Story**

Create `package/src/WorkQueue.story.tsx`:

```tsx
import { Box } from '@mantine/core';
import React from 'react';
// The example app lives in the docs; .storybook/main.ts points its 'mantine-messages' imports here
import { WorkQueue } from '../../docs/demos/WorkQueue/WorkQueue';

export default { title: 'Work queue' };

export function Queue() {
  return (
    <Box p="md">
      <WorkQueue h={720} />
    </Box>
  );
}

export function OpenTicket() {
  return (
    <Box p="md">
      <WorkQueue h={720} defaultTicketId="T-1042" />
    </Box>
  );
}
```

- [ ] **Step 2: Docs demo**

Create `docs/demos/WorkQueue.demo.tsx`:

```tsx
import { MantineDemo } from '@mantinex/demo';
import React from 'react';
import { WorkQueue } from './WorkQueue/WorkQueue';

// The app is a dozen files; the code tab shows how the timeline is built, and links to the rest
const code = `
// Full source: https://github.com/sernstberger/mantine-messages/tree/main/docs/demos/WorkQueue
import { useRef } from 'react';
import { Composer, MessageList, type MessageListControl } from 'mantine-messages';

type TimelineItem = EmailItem | ChatMessage | SystemEvent;

function Ticket({ ticket }: { ticket: Ticket }) {
  const timeline = useRef<MessageListControl>(null);

  return (
    <>
      <MessageList<TimelineItem>
        items={ticket.items}
        controlRef={timeline}
        renderItem={(item, { highlighted }) =>
          !('kind' in item) ? <ChatRow message={item} highlighted={highlighted} />
          : item.kind === 'email' ? <EmailCard email={item} onOpen={setOpenEmail} />
          : <EventLine event={item} />
        }
      />
      <Composer
        modes={[
          { value: 'reply', label: 'Reply' },
          { value: 'note', label: 'Internal note', color: 'yellow', note: true },
        ]}
        onSend={({ text, mode }) => send(ticket.id, text, mode === 'note')}
      />
      {/* In the sidebar: jump to an event in the timeline and flash it */}
      <ActivityList ticket={ticket} onJumpTo={(id) => timeline.current?.jumpTo(id)} />
    </>
  );
}
`;

function Demo() {
  return <WorkQueue h={640} />;
}

export const workQueue: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};
```

Append to `docs/demos/index.ts`:

```ts
export { workQueue } from './WorkQueue.demo';
```

- [ ] **Step 3: docs.mdx**

In `docs/docs.mdx`, before `## Inbox` (after the assistant demo), add:

```mdx
## Work queue (example)

A support work queue built from the package: an example app, not a component. Its source is in
[`docs/demos/WorkQueue`](https://github.com/sernstberger/mantine-messages/tree/main/docs/demos/WorkQueue);
copy what you need. Ticket fields (status, priority, assignee, SLA, snooze) are the app's own
types; the package knows nothing about them.

- Triage: a Mantine `Table` with status, priority, assignee, age and SLA; sort by priority, age
  or SLA; filter by view (Inbox, Snoozed, Closed, All), priority and assignee; search; select
  tickets to assign, tag or close them together
- Timeline: one `MessageList` per ticket with a `renderItem` that draws emails as cards, chat
  messages and internal notes (`visibility: 'internal'`) with `Message` parts, and events as
  lines. An email card opens the full message in a `Modal`
- Composer: `Composer` with Reply and Internal note `modes`; `draft.mode` decides which one is
  added
- Actions: assign, status, priority and snooze until a time; a snoozed ticket leaves the Inbox
  until then. Each change adds an event to the timeline, and the Activity list beside it jumps to
  that event through `controlRef`

<Demo data={demos.workQueue} />
```

- [ ] **Step 4: CHANGELOG**

In `CHANGELOG.md`, under `## Unreleased` / `### Added`, append:

```markdown
- Work queue example in the docs and Storybook: a triage table (sort, filter, search, bulk
  assign, close and tag), one timeline per ticket mixing emails, chat, internal notes and events,
  Reply and Internal note from one composer, and assign, status, priority and snooze
```

- [ ] **Step 5: Verify**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test && npm run docs:build`
Expected: exit 0, 100%; the Next build finishes (it compiles the demo against `package/dist`). Then `npx storybook build --test --quiet -o /tmp/sb-check` finishes and lists a `WorkQueue.story-*.js` chunk; delete `/tmp/sb-check` afterwards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add the work queue to Storybook and the docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Gate and browser check (lead)

**Files:** none (fixes found here go in their own commits with tests).

- [ ] **Step 1: Gate on the merged branch**

Run: `npm run build && npm run docgen && npm test` (background, watch tab). Expected: exit 0, 100%.

- [ ] **Step 2: Browser check (Steve watches)**

Storybook on port 8281 (`npm run storybook` if it is not running).

`http://localhost:8281/?path=/story/work-queue--queue`:
- The view switch reads Inbox 10, Snoozed 1, Closed 1, All 12. The table has Ticket, Status, Priority, Assignee, Age and SLA columns; the first rows are "Android app crashes on launch" (Overdue 2h, red), "Charged twice for the March invoice" (Overdue 20m, red), "Webhook deliveries failing with 410" (15m left, orange); later rows are teal; the SLA header shows ▲.
- Click Priority: urgent tickets come first and the arrow moves there; click again: ▼, low first. Age sorts newest first, then oldest.
- Search "okta" leaves one row; "#billing" tags appear under subjects; the priority and assignee selects filter; "Unassigned" shows the three unassigned tickets.
- Tick two rows: they turn light blue, the header checkbox is indeterminate, a blue bar reads "2 selected". Assign → Priya Raman: both rows show Priya and the bar goes. Tag → #vip shows under the subject. Close tickets: the rows leave the Inbox and the counts change; Closed lists them.
- Snoozed shows only "Change of invoice address".

Open "Charged twice for the March invoice" (or `?path=/story/work-queue--open-ticket`):
- The header has "← Queue", the subject, "T-1042 · Nora Feld" and an Open badge.
- The timeline shows, in order: an email card (Nora Feld <nora@brightloop.example>, To: support@lumen.example, the subject as a link, a two-line preview), "Ticket created from email" centred and dimmed, Maya's internal note on a yellow background with a yellow left edge and "Internal note", and Nora's chat message. A date divider sits above the first item. The view opens at the bottom.
- Click the email subject: a modal with From, To, Cc (ap@brightloop.example), Date, a divider, and the body with its line breaks kept. Escape and the close button both close it.
- Reply mode: type and press Enter: the reply appears at the bottom, not yellow, and the view scrolls to it. Switch to Internal note: the switch turns yellow, the placeholder reads "Only your team sees notes", and the sent note is yellow.
- Sidebar: change Assignee, Status and Priority: each adds a "You …" event line in the timeline and a button in Activity; the header badge follows the status. The Assignee clear button unassigns.
- Click "Ticket created from email" in Activity: the timeline scrolls to that line and it flashes light blue for about 1.6 s (this is `controlRef`).
- Snooze… → In 1 hour: the sidebar shows "Snoozed until …" with Unsnooze. "← Queue": the ticket is gone from the Inbox and Snoozed reads 2. The custom "Until" field accepts a date and time; "Snooze until then" stays disabled for a past time.

Both stories with `&globals=theme:dark`: the table, badges, the yellow notes, the selected-row and flash colours, the email card and the modal read well.

Docs (`npm run dev`, `http://localhost:9291`): the "Work queue (example)" section renders with the demo working the same way, the code tab shows the excerpt and the GitHub link, and the "Building your own layout" section shows the `controlRef` example; the MessageList Props tab lists `controlRef`.

- [ ] **Step 3: Fix what the check finds**

Each fix gets a test where one can catch it, then `npm test` and its own commit.

---

## Self-review

- **Spec coverage.** Triage list with status, priority, assignee, age/SLA: Task 4. Sort, filter, search: Tasks 3 and 4. Bulk assign / close / tag: Tasks 3, 4 and 7. One timeline mixing emails, chat, internal notes and events on `MessageList` with `renderItem`: Task 5 (data with all four kinds: Task 2, checked by a test). Emails as cards and a `Modal` with headers and plain text, phase 5 seam: Task 5 (`EmailBody`). Reply and Note from one composer: Task 7. Assign, status, priority, snooze until a date/time, snoozed out of the default view: Tasks 3, 6 and 7. `controlRef` with `MessageListControl`, forwarded, exported, tested, documented: Task 1 (docs usage in Task 1, Props table through docgen). Example in `docs/demos/WorkQueue/`, one copy, used by the docs demo and a story, with the Storybook alias: Tasks 2 and 8. Example at 100% in `npm test`: Task 2 config, every task's tests. About twelve tickets: Task 2. Docs section with the demo: Task 8. Storybook story checked in the browser on port 8281: Task 9. Work-queue fields only in the example: `types.ts`, Global Constraints.
- **Placeholders.** None: every code step embeds the prototype's final file, which passed `npm test` (614 tests, 100%), `npm run docs:build` and `storybook build`.
- **Type consistency.** `QueueAction` (Task 3) is what `TicketSidebar` (6), `TicketView` and `WorkQueue` (7) dispatch; `nameGetter`, `formatDateTime`, `STATUS_COLORS` and friends are defined once in `queue.ts`; `controlRef?: React.Ref<MessageListControl>` has the same shape on `MessageList`, the three threads and `TicketTimeline`.

## After this phase

Merge `feat/work-queue` the same way as phases 1 to 3 (full suite on the result), push, and open a PR so CI runs. Phase 5 (the email renderer in mantine-doc-viewer) then replaces `EmailBody` in `docs/demos/WorkQueue/EmailModal.tsx`.

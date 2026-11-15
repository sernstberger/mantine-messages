# Phase 0: Breaking Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every breaking change the feature-set spec calls for now, before anything depends on the current names: per-scenario types, plain-text previews, `Thread` renamed to `ChatThread`, and `Composer.onSend` taking a draft object.

**Architecture:** No new behaviour. Types move from one `Message` to `MessageBase` + `ChatMessage` + `SystemEvent`; a `getPreview` helper gives plain text wherever a body is shown outside its bubble; the Thread component, its files, Styles API name and docs are renamed; Composer sends a `ComposerDraft`.

**Tech Stack:** React 19, Mantine 9.8 (`factory`, Styles API), TypeScript, Jest + @mantine-tests/core + Testing Library, Storybook 8, Next docs site, yarn 4 workspaces.

**Spec:** `docs/specs/2026-11-15-feature-set-design.md`

## Global Constraints

- Peers of the root entry: `@mantine/core`, `@mantine/hooks`, `react`, `react-dom` only. Never import an optional peer from the root entry.
- `npm test` must pass: syncpack, oxfmt format check, typecheck (package and docs), oxlint, stylelint, Jest with 100% statements, branches, functions and lines.
- The docs typecheck reads `package/dist` types: run `npm run build` before `npm test` whenever exported types change.
- Every component uses `factory()`, `useProps`, the Styles API and `data-*` modifiers.
- Mantine components and hooks wherever they fit.
- Run commands from `/Users/stevo/src/mantine-messages`. To show output in Steve's watch tab, wrap each command as `{ printf '\n$ CMD\n'; CMD 2>&1; } | tee -a .claude/run.log`.
- Format before testing: `npx oxfmt -c oxfmt.config.mjs --write package/src docs/demos docs/styles-api`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Commit the finished reply work

The working tree holds finished, tested work (reply quotes, reply button, Composer reply bar, Mantine `Text`/`EmptyState` swaps). Commit it so phase 0 starts clean.

**Files:** everything in `git status`.

**Interfaces:**
- Consumes: nothing.
- Produces: a clean tree on `feat/scaffold`.

- [ ] **Step 1: Run the gate**

Run: `npm run build && npm run docgen && npm test`
Expected: `Tests: 147 passed`, coverage 100% on all four measures, exit 0.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Add replies: quote above the bubble, reply button and reply bar

ChatThread shows the message a reply answers as a faded copy tucked under
the reply's bubble, with a caption such as \"You replied to Maya\"; a click
scrolls to the original and flashes it. onReply shows a reply button on
hover and focus. Composer takes replyTo and onCancelReply (close button
or Escape) and focuses the box. Names, times, previews and the empty
inbox now use Mantine Text and EmptyState.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Split the types and rename `Message` to `ChatMessage`

**Files:**
- Modify: `package/src/types.ts`
- Modify (rename only): `package/src/sample-data.ts`, `package/src/Messages.story.tsx`, `package/src/utils/group-messages.ts`, `package/src/utils/group-messages.test.ts`, `package/src/Thread/Thread.tsx`, `package/src/Thread/Thread.test.tsx`, `package/src/Thread/Thread.replies.test.tsx`, `package/src/Thread/Thread.scroll.test.tsx`, `docs/demos/data.ts`, `docs/demos/Messenger.demo.tsx`
- Test: `package/src/types.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces (exported from `package/src/index.ts` via `export type * from './types'`):
  - `MessageBase { id: string; authorId: string; createdAt: MessageDate }`
  - `ChatMessage extends MessageBase` with `body`, `format?`, `preview?`, `status?`, `replyToId?`, `threadId?`, `thread?: MessageThreadSummary`, `attachments?`, `reactions?`, `editedAt?`, `visibility?`
  - `SystemEvent extends MessageBase { kind: 'event'; text: string }`
  - `MessageThreadSummary { count: number; lastReplyAt: MessageDate; participantIds: string[] }`
  - `Conversation.kind?: 'direct' | 'group' | 'channel'`; `Conversation.lastMessage?: Pick<ChatMessage, 'body' | 'format' | 'preview' | 'createdAt' | 'authorId'>`
  - `Message` no longer exists.

- [ ] **Step 1: Write the failing type test**

Create `package/src/types.test.ts`:

```ts
import type { ChatMessage, Conversation, MessageBase, SystemEvent } from './types';

describe('types', () => {
  it('builds chat messages and events on one base', () => {
    const base: MessageBase = { id: 'a', authorId: 'maya', createdAt: 0 };
    const chat: ChatMessage = {
      ...base,
      body: '**Hi**',
      format: 'markdown',
      preview: 'Hi',
      threadId: 't1',
      thread: { count: 2, lastReplyAt: 1, participantIds: ['maya'] },
      editedAt: 2,
      visibility: 'internal',
    };
    const event: SystemEvent = { ...base, id: 'e', kind: 'event', text: 'Maya joined' };
    const conversation: Conversation = {
      id: 'c',
      title: 'Design',
      kind: 'channel',
      lastMessage: { authorId: 'maya', body: chat.body, format: 'markdown', createdAt: 0 },
    };

    expect([chat.id, event.kind, conversation.kind]).toEqual(['a', 'event', 'channel']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsc --noEmit`
Expected: errors such as `Module '"./types"' has no exported member 'ChatMessage'`.

- [ ] **Step 3: Replace the `Message` interface in `package/src/types.ts`**

Replace the block from `export interface Message {` to its closing `}` with:

```ts
/** What every item in a message list has */
export interface MessageBase {
  id: string;

  /** `id` of the `MessagesUser` who wrote it */
  authorId: string;
  createdAt: MessageDate;
}

/** Replies in a Slack-style thread under a message */
export interface MessageThreadSummary {
  count: number;
  lastReplyAt: MessageDate;
  participantIds: string[];
}

/** A message people send each other, in ChatThread and TeamThread */
export interface ChatMessage extends MessageBase {
  body: string;

  /** How `body` is written, `'text'` by default; markdown needs `mantine-messages/markdown` */
  format?: 'text' | 'markdown';

  /** Plain text for inbox previews, quotes and labels; derived from `body` when missing */
  preview?: string;
  status?: MessageStatus;

  /** `id` of the message this one replies to */
  replyToId?: string;

  /** `id` of the message whose thread this one belongs to */
  threadId?: string;

  /** Set on a message that has thread replies */
  thread?: MessageThreadSummary;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  editedAt?: MessageDate;

  /** `'internal'` for notes only teammates see, `'public'` by default */
  visibility?: 'public' | 'internal';
}

/** Something that happened in a conversation, for example "Maya joined" */
export interface SystemEvent extends MessageBase {
  kind: 'event';
  text: string;
}
```

In the `Conversation` interface, replace the `lastMessage` line and add `kind`:

```ts
  /** What the conversation is, for icons and grouping in an inbox */
  kind?: 'direct' | 'group' | 'channel';
  lastMessage?: Pick<ChatMessage, 'body' | 'format' | 'preview' | 'createdAt' | 'authorId'>;
```

- [ ] **Step 4: Rename the uses**

The Composer files contain the word `Message` as placeholder text, and the story has `Message ${index + 1} of 80`; both must stay. Run:

```bash
perl -pi -e 's/\bMessage\b(?! \$\{)/ChatMessage/g' \
  package/src/sample-data.ts package/src/Messages.story.tsx \
  package/src/utils/group-messages.ts package/src/utils/group-messages.test.ts \
  package/src/Thread/Thread.tsx package/src/Thread/Thread.test.tsx \
  package/src/Thread/Thread.replies.test.tsx package/src/Thread/Thread.scroll.test.tsx \
  docs/demos/data.ts docs/demos/Messenger.demo.tsx
grep -rnw "Message" package/src docs/demos | grep -v "types.ts"
```

Expected from grep: only `Composer.tsx` (comment and `placeholder: 'Message'`), `Composer.test.tsx` (`name: 'Message'`) and `Messages.story.tsx` (`Message ${index + 1} of 80`).

- [ ] **Step 5: Typecheck and test**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs/demos && npx tsc --noEmit && npm run coverage`
Expected: no type errors; all tests pass, 100% coverage.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Split Message into MessageBase, ChatMessage and SystemEvent

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Plain-text previews for inbox rows, quotes and labels

Markdown must never leak into an inbox preview, a reply quote or a screen-reader label.

**Files:**
- Create: `package/src/utils/preview.ts`
- Test: `package/src/utils/preview.test.ts`
- Modify: `package/src/Inbox/Inbox.tsx` (preview line), `package/src/Thread/Thread.tsx` (quote body and reply button label), `package/src/index.ts` (export)
- Modify tests: `package/src/Inbox/Inbox.test.tsx`, `package/src/Thread/Thread.replies.test.tsx`

**Interfaces:**
- Consumes: `ChatMessage` from Task 2.
- Produces: `getPreview(message: Pick<ChatMessage, 'body' | 'format' | 'preview'>): string`, `stripMarkdown(text: string): string`, `truncate(text: string, max: number): string`, all exported from the package root.

- [ ] **Step 1: Write the failing tests**

Create `package/src/utils/preview.test.ts`:

```ts
import { getPreview, stripMarkdown, truncate } from './preview';

describe('stripMarkdown', () => {
  it('removes emphasis, code, links, headings, quotes and list marks', () => {
    expect(stripMarkdown('**Bold** and *it* and _em_ and ~~old~~')).toBe('Bold and it and em and old');
    expect(stripMarkdown('Run `npm test` then [the docs](https://x.dev)')).toBe(
      'Run npm test then the docs'
    );
    expect(stripMarkdown('![chart](a.png)')).toBe('chart');
    expect(stripMarkdown('# Title\n> quoted\n- one\n* two')).toBe('Title quoted one two');
    expect(stripMarkdown('```ts\nconst a = 1;\n```')).toBe('const a = 1;');
  });

  it('keeps underscores inside words', () => {
    expect(stripMarkdown('rename snake_case_name')).toBe('rename snake_case_name');
  });
});

describe('getPreview', () => {
  it('prefers preview, then strips markdown, else returns the body', () => {
    expect(getPreview({ body: '**x**', format: 'markdown', preview: 'Custom' })).toBe('Custom');
    expect(getPreview({ body: '**x**', format: 'markdown' })).toBe('x');
    expect(getPreview({ body: '**x**' })).toBe('**x**');
  });
});

describe('truncate', () => {
  it('cuts long text with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest package/src/utils/preview`
Expected: FAIL, `Cannot find module './preview'`.

- [ ] **Step 3: Implement `package/src/utils/preview.ts`**

```ts
import type { ChatMessage } from '../types';

/** Markdown reduced to plain text, on one line */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(^|\W)__(.+?)__(?=\W|$)/g, '$1$2')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain text of a message for previews, quotes and labels */
export function getPreview(message: Pick<ChatMessage, 'body' | 'format' | 'preview'>): string {
  if (message.preview !== undefined) {
    return message.preview;
  }

  return message.format === 'markdown' ? stripMarkdown(message.body) : message.body;
}

/** `text` cut to `max` characters, ending in an ellipsis when cut */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest package/src/utils/preview`
Expected: PASS, 4 tests.

- [ ] **Step 5: Use previews in Inbox and Thread, with failing tests first**

Append to `package/src/Inbox/Inbox.test.tsx` inside the `describe`:

```tsx
  it('previews markdown as plain text', () => {
    render(
      <Inbox
        conversations={[
          {
            id: 'x',
            title: 'X',
            lastMessage: { authorId: 'x', body: '**Ship** it', format: 'markdown', createdAt: 0 },
          },
        ]}
      />
    );
    expect(screen.getByText('Ship it')).toBeInTheDocument();
  });
```

Append to `package/src/Thread/Thread.replies.test.tsx` inside the `describe`:

```tsx
  it('quotes and labels markdown as plain text, cutting long labels', () => {
    const long = `**Plan:** ${'word '.repeat(30)}`;
    render(
      <Thread
        messages={[
          { ...messages[0], body: long, format: 'markdown' },
          messages[1],
        ]}
        users={users}
        currentUserId="me"
        onReply={() => {}}
      />,
      { wrapper: MantineProvider }
    );
    // getPreview gives "Plan: word word …" (155 characters); truncate keeps 79 plus "…"
    const label = `Reply: ${('Plan: ' + 'word '.repeat(30).trim()).slice(0, 79)}…`;
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plan: word/ })).toBeInTheDocument();
  });
```

Run: `npx jest package/src/Inbox package/src/Thread/Thread.replies`
Expected: both new tests FAIL (raw `**Ship** it`; label not found).

Then in `package/src/Inbox/Inbox.tsx` add `import { getPreview } from '../utils/preview';` and replace `{conversation.lastMessage?.body}` with:

```tsx
                {conversation.lastMessage && getPreview(conversation.lastMessage)}
```

In `package/src/Thread/Thread.tsx` add `import { getPreview, truncate } from '../utils/preview';`, replace `{original.body}` inside the quote with `{getPreview(original)}`, and replace the reply button's label with:

```tsx
                        aria-label={`${allLabels.reply}: ${truncate(getPreview(message), 80)}`}
```

Export the helpers from `package/src/index.ts`:

```ts
export { getPreview, stripMarkdown, truncate } from './utils/preview';
```

and add `'getPreview', 'stripMarkdown', 'truncate'` to the sorted key list in `package/src/index.test.ts`:

```ts
    expect(Object.keys(messages).sort()).toEqual([
      'Composer',
      'Inbox',
      'Thread',
      'getPreview',
      'groupMessages',
      'stripMarkdown',
      'truncate',
    ]);
```

- [ ] **Step 6: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npm run coverage`
Expected: all pass, 100% coverage.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Show markdown as plain text in previews, quotes and labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Rename `Thread` to `ChatThread`

**Files:**
- Move: `package/src/Thread/` → `package/src/ChatThread/`; inside it `Thread.tsx` → `ChatThread.tsx`, `Thread.module.css` → `ChatThread.module.css`, `Thread.test.tsx` → `ChatThread.test.tsx`, `Thread.replies.test.tsx` → `ChatThread.replies.test.tsx`, `Thread.scroll.test.tsx` → `ChatThread.scroll.test.tsx` (`use-stick-to-bottom.ts` keeps its name)
- Modify: `package/src/index.ts`, `package/src/index.test.ts`, `package/src/Messages.story.tsx`, `scripts/docgen.ts`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `docs/demos/Messenger.demo.tsx`, `docs/docs.mdx`, `README.md`

**Interfaces:**
- Consumes: Task 3's exports.
- Produces: `ChatThread`, `ChatThreadProps`, `ChatThreadFactory`, `ChatThreadStylesNames`, `ChatThreadLabels`; Styles API name `'ChatThread'` (class names `mantine-ChatThread-*`; theme key `components.ChatThread`). `Thread*` names no longer exist.

- [ ] **Step 1: Change the export test first**

In `package/src/index.test.ts` replace `'Thread',` with `'ChatThread',` and move it to keep the list sorted (it goes before `'Composer'`).

Run: `npx jest package/src/index.test`
Expected: FAIL, received keys contain `Thread`.

- [ ] **Step 2: Move the files**

```bash
git mv package/src/Thread package/src/ChatThread
cd package/src/ChatThread
for f in Thread.tsx Thread.module.css Thread.test.tsx Thread.replies.test.tsx Thread.scroll.test.tsx; do git mv "$f" "Chat$f"; done
cd /Users/stevo/src/mantine-messages
```

- [ ] **Step 3: Rename identifiers and paths**

`\bThread` with a word boundary on both sides leaves `ThreadItem`, `ThreadOnly` and `LongThread` alone.

```bash
perl -pi -e 's/\bThread(Props|Factory|StylesNames|Labels)?\b/ChatThread$1/g; s#\./Thread\.module\.css#./ChatThread.module.css#; s#/Thread/Thread#/ChatThread/ChatThread#g; s#\./Thread\x27#./ChatThread\x27#g' \
  package/src/ChatThread/*.ts* package/src/index.ts package/src/Messages.story.tsx \
  scripts/docgen.ts docs/pages/index.tsx docs/styles-api/index.ts docs/demos/Messenger.demo.tsx \
  docs/docs.mdx README.md
grep -rn "\bThread\b" package/src scripts docs/pages docs/styles-api docs/demos docs/docs.mdx README.md
```

Expected from grep: no matches. If prose in `docs/docs.mdx` or `README.md` now reads awkwardly ("ChatThread takes messages"), leave it: the component is named that.

- [ ] **Step 4: Build, regenerate docs data, run the gate**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test`
Expected: exit 0, 100% coverage.

- [ ] **Step 5: Check Storybook**

Open `http://localhost:8281/?path=/story/messages--messenger` in the browser pane. Expected: the thread renders as before; in devtools the root has class `mantine-ChatThread-root`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rename Thread to ChatThread

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `Composer.onSend` takes a draft object

**Files:**
- Modify: `package/src/Composer/Composer.tsx`
- Modify: `package/src/Composer/Composer.test.tsx`
- Modify: `package/src/Messages.story.tsx`, `docs/demos/Messenger.demo.tsx`, `docs/docs.mdx`
- Modify: `package/src/index.ts` (export `ComposerDraft`, `ComposerReply`, `ComposerLabels` types)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ComposerDraft { text: string; format: 'text' | 'markdown'; attachments: File[]; mode?: string; replyToId?: string }`
  - `ComposerReply { id: string; authorName: string; body: string }` (`id` is new)
  - `ComposerProps.onSend?: (draft: ComposerDraft) => void`
  - `ComposerProps.format?: 'text' | 'markdown'`, `'text'` by default, copied into each draft

- [ ] **Step 1: Update the tests first**

In `package/src/Composer/Composer.test.tsx`:

Replace `expect(onSend).toHaveBeenCalledWith('hello');` with:

```tsx
    expect(onSend).toHaveBeenCalledWith({ text: 'hello', format: 'text', attachments: [] });
```

Replace `expect(onSend).toHaveBeenCalledWith('hi');` with:

```tsx
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text', attachments: [] });
```

In the test `'shows who the reply is for and focuses the box'` and `'cancels the reply with the close button or Escape'`, add `id: 'm1', ` at the start of each `replyTo={{ ... }}` object.

Append inside the `describe`:

```tsx
  it('sends the reply id and the format with the draft', async () => {
    const onSend = jest.fn();
    render(
      <Composer
        format="markdown"
        replyTo={{ id: 'm1', authorName: 'Maya', body: 'Hi' }}
        onSend={onSend}
      />
    );
    await userEvent.type(screen.getByRole('textbox'), '**yes**{Enter}');
    expect(onSend).toHaveBeenCalledWith({
      text: '**yes**',
      format: 'markdown',
      attachments: [],
      replyToId: 'm1',
    });
  });
```

Run: `npx jest package/src/Composer`
Expected: FAIL (called with a string; `format` and `id` props unknown to TypeScript are ignored by esbuild, so the failures are the assertions).

- [ ] **Step 2: Implement in `package/src/Composer/Composer.tsx`**

Add `id: string;` as the first field of `ComposerReply`, with the comment `/** \`id\` of the message being answered, sent as \`replyToId\` */`.

Add after `ComposerReply`:

```ts
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
```

Replace the `onSend` prop and its comment with:

```ts
  /** Called with the draft when the user sends it; the box then clears */
  onSend?: (draft: ComposerDraft) => void;

  /** How the text is written, copied into each draft, `'text'` by default */
  format?: 'text' | 'markdown';
```

Add `format: 'text',` to `defaultProps`, add `format,` to the destructured props after `onSend,`, and replace the body of `send` with:

```ts
    if (canSend) {
      onSend?.({
        text: text.trim(),
        format: format!,
        attachments: [],
        ...(replyTo && { replyToId: replyTo.id }),
      });
      setText('');
    }
```

In `package/src/index.ts` replace the Composer type export with:

```ts
export type {
  ComposerProps,
  ComposerFactory,
  ComposerStylesNames,
  ComposerDraft,
  ComposerReply,
  ComposerLabels,
} from './Composer/Composer';
```

- [ ] **Step 3: Update callers**

In `package/src/Messages.story.tsx`, Messenger story: change `const send = (body: string) => {` to `const send = ({ text: body }: ComposerDraft) => {`, add `id: replyTo.id,` to the `replyTo={...}` object passed to Composer, and import the type: `import { Composer, type ComposerDraft } from './Composer/Composer';`. LongThread story: change `onSend={(body) =>` to `onSend={({ text: body }) =>`.

In `docs/demos/Messenger.demo.tsx`, in both the `code` string and the `Demo` function: change `const send = (body: string) =>` to `const send = ({ text: body }: ComposerDraft) =>` and add `ComposerDraft` to the import from `'mantine-messages'` (in the code string as `type ComposerDraft`).

In `docs/docs.mdx`, Replies section example: replace

```tsx
  replyTo={replyTo && { authorName: nameOf(replyTo.authorId), body: replyTo.body }}
  onCancelReply={() => setReplyTo(null)}
  onSend={(body) => {
    send({ body, replyToId: replyTo?.id });
```

with

```tsx
  replyTo={replyTo && { id: replyTo.id, authorName: nameOf(replyTo.authorId), body: getPreview(replyTo) }}
  onCancelReply={() => setReplyTo(null)}
  onSend={(draft) => {
    send({ body: draft.text, replyToId: draft.replyToId });
```

and in the Composer section replace "the text is trimmed before `onSend` gets it." with "`onSend` gets a draft: `{ text, format, attachments, replyToId }`, with the text trimmed."

- [ ] **Step 4: Gate**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs && npm run build && npm run docgen && npm test`
Expected: exit 0, 100% coverage.

- [ ] **Step 5: Check Storybook**

In `http://localhost:8281/?path=/story/messages--messenger`: hover a message from Maya, click Reply, type, press Enter. Expected: your message appears with "You replied to Maya Lindqvist" and the faded quote; the reply bar clears; Maya answers 1.5 s later.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Send a draft object from Composer: text, format, attachments, replyToId

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: CHANGELOG

**Files:**
- Create: `CHANGELOG.md`

**Interfaces:** none.

- [ ] **Step 1: Write `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to mantine-messages. The package is not published yet; the first release
will be 0.1.0.

## Unreleased

### Added

- `Inbox`: conversation list with previews, times, unread counts, muted state and selection
- `ChatThread`: chat bubbles grouped by author and time, date dividers, read status, scrolling
  that keeps the newest message in view, replies shown above the bubble with a jump to the
  original, and a reply button through `onReply`
- `Composer`: text box that grows, Enter to send, a reply bar with cancel
- Types: `MessageBase`, `ChatMessage`, `SystemEvent`, `Conversation`, `MessagesUser`
- Helpers: `groupMessages`, `getPreview`, `stripMarkdown`, `truncate`
```

- [ ] **Step 2: Run the gate and commit**

Run: `npm test`
Expected: exit 0.

```bash
git add CHANGELOG.md
git commit -m "Add a changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Later phases

Each gets its own plan, written from the code as it stands when the phase before it lands:

| Phase | Plan file (to write) | Depends on |
|---|---|---|
| 1. Engine | `docs/specs/<date>-phase-1-engine-plan.md` | Phase 0 |
| 2. Team chat | `docs/specs/<date>-phase-2-team-chat-plan.md` | Phase 1 |
| 3. Markdown and LLM | `docs/specs/<date>-phase-3-markdown-assistant-plan.md` | Phase 1 |
| 4. Work queue example | `docs/specs/<date>-phase-4-work-queue-plan.md` | Phases 2 and 3 |
| 5. Email renderer | in the mantine-doc-viewer repo | Its lane branches merged |

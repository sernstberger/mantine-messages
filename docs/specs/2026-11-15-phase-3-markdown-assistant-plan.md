# Phase 3: Markdown and Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two subpath entries of the first release: `mantine-messages/markdown` (`MarkdownBody`) and `mantine-messages/assistant` (`AssistantThread`: streamed answers with markdown and code, collapsible reasoning and tool steps, Stop, Regenerate, edit and resend, an announcement of each finished answer), with react-markdown and remark-gfm as optional peers that the root entry never reaches, proven by a check of the built root bundle.

**Architecture:** The root entry gains only cheap, peer-free pieces: the `AssistantMessage` types, `ChatThread.renderBody`, `Composer` `streaming`/`onStop`, and `useMessageList` following a last item that grows. `MarkdownBody` wraps react-markdown with Mantine `Typography`, `Anchor`, `Code` and `CopyButton`. `AssistantThread` is a `renderItem` for `AssistantMessage` on `MessageList`; each text part memoizes its `MarkdownBody` element on its text, so finished parts never render again. Rollup builds three entries (`index`, `markdown`, `assistant`) with `preserveModules`; a script walks the import graph of the built root entry and fails on anything but the required peers.

**Tech Stack:** React 19, Mantine 9.8 (`factory`, Styles API, `Typography`, `Anchor`, `Code`, `CopyButton`, `Collapse`, `Badge`, `Alert`, `Loader`, `Textarea`, `Button`, `VisuallyHidden`, `useDisclosure`, `useId`), react-markdown 10.1.0, remark-gfm 4.0.1, TypeScript 6, Jest + @mantine-tests/core + Testing Library, Storybook 8, Next 16 docs.

**Spec:** `docs/specs/2026-11-15-feature-set-design.md` (phase 3 row of "Build order", the LLM chat row of "Scenarios", the `AssistantPart`/`AssistantMessage` types and the Rules).

## Decisions

The spec left these open; each is settled here.

| Question | Decision | Why |
|---|---|---|
| Code highlighting | Mantine `<Code block>` with a language label and a `CopyButton`; no `@mantine/code-highlight` | No third optional peer and no highlighter adapter to configure; apps that want colours pass `components={{ pre: ... }}` |
| Raw HTML in markdown | react-markdown's default: shown as text, never turned into elements; no `rehypePlugins` prop at all | Safe by default with nothing to configure; `javascript:` links are dropped by react-markdown's default `urlTransform` |
| CSS | One `styles.css` for all three entries | No CSS imports an optional peer; one import line for apps |
| Where Stop lives | `Composer` props `streaming` + `onStop`: the send button becomes a stop button | Matches ChatGPT and Claude (Stop replaces Send in the input), reusable by any streaming UI, keeps `AssistantThread` display-only |
| Prompt layout | Prompts are compact bubbles on the right; answers full width, no bubble, in a centred 48rem column | Claude/ChatGPT style |
| Reasoning and tool steps | Mantine `Collapse` (9.8 prop `expanded`, `keepMounted={false}`) under an `UnstyledButton` with `aria-expanded` | One disclosure per step; `Accordion` adds item/panel structure we do not need |
| Regenerate and Retry | One handler, `onRegenerate(message)`: a Regenerate action on the last answer, a Retry button in the error alert | Both mean "answer this prompt again" |
| Edit and resend | `onEdit(message, text)`: the Edit action turns the prompt into an inline `Textarea` with Cancel and Send; Enter sends, Escape cancels | In-place editing like Claude; the app trims the history and asks again |
| Actions while streaming | Copy and Regenerate show on an answer once it is not streaming; Edit hides while any answer streams | Nothing to copy yet; editing mid-stream would race the stream |
| Error text | `AssistantMessage` gains `error?: string`, shown in the alert | The spec has `status: 'error'` but nowhere to say what went wrong |
| Screen readers | The log keeps `role="log"` but gets `aria-live="off"`; a `VisuallyHidden role="status" aria-live="polite"` region receives the text of an answer when it goes from `streaming` to `done`. Errors are announced by `Alert` (`role="alert"`), not the status region. Answers already finished when the thread mounts are not announced | Every token in a polite log would be read; the user wants the finished answer once |
| Following a growing answer | `useMessageList`'s layout effect, which runs after every render, also handles "same ids, taller content": while the user is at the bottom and `autoScroll` is on, it sets `scrollTop = scrollHeight` (no smooth scroll) | Each token arrives as a render, so the effect sees the new height before paint; no `ResizeObserver` plumbing, and jsdom tests already fake `scrollHeight` |
| Waiting indicator | `Loader type="dots"` labelled "Thinking…" while an answer streams with no parts yet | Shows the model is working before the first token |
| Peer check | `scripts/check-root-peers.ts`, run as `npm run check:peers` inside `npm test`; it reads `package/dist` (CI builds before `npm test`; locally the constraints already require `npm run build` before `npm test`). Adds well under a second | Checks the real built bundle, as the spec asks, without adding a build to every test run |
| Jest and ESM-only peers | `moduleNameMapper` maps `react-markdown` and `remark-gfm` to stand-ins in `test-utils/`; the react-markdown stand-in parses just fenced code, inline code and links so the real `components` run | Jest runs CommonJS; the doc viewer uses the same mapping |
| Subpath file names | Entries are `package/src/markdown.ts` and `package/src/assistant.ts`, built to `dist/esm/markdown.mjs`, `dist/cjs/markdown.cjs`, `dist/types/markdown.d.ts` / `.d.mts` (same for assistant) | Flat names next to `index`; no folder that differs from `MarkdownBody/` only by case |
| Peer ranges | `"react-markdown": "^10.0.0"`, `"remark-gfm": "^4.0.0"` with `peerDependenciesMeta` `optional: true` | The majors we build and test against |

## Global Constraints

- The root entry peers only `@mantine/core`, `@mantine/hooks`, `react`, `react-dom`. Never import an optional peer (react-markdown, remark-gfm) from the root entry or from any module it reaches, not even lazily. `scripts/check-root-peers.ts` (Task 7) enforces it.
- `npm test` must pass: syncpack (versions match across workspaces), oxfmt format check, typecheck (package and docs), oxlint (`prefer-template`: no string concatenation; `curly`), stylelint, Jest with 100% statements, branches, functions and lines. Each task's commit stands at 100% on its own.
- Run `npm run build && npm run docgen` before `npm test` whenever exports, exported types or components change (the docs typecheck and the peer check read `package/dist`).
- Every component uses `factory()`, `useProps`, the Styles API and `data-*` modifiers. State rules that must beat light/dark or hover backgrounds use `[data-x]`, not `:where()`. Props that clash with DOM event names need `ElementProps<'div', 'name'>`.
- Mantine components and hooks wherever they fit. Every API used below was confirmed in `node_modules/@mantine/core/lib` (9.8.0): `Collapse` takes `expanded` (not `in`) and `keepMounted`; `Typography` exists (not `TypographyStylesProvider`); `CopyButton` gives `{ copied, copy }`; `Alert` renders `role="alert"`; `Code block` renders `<pre>`; `GetStylesApi` is exported.
- react-markdown and remark-gfm are ESM only. Jest (esbuild-jest, CommonJS, jsdom) gets stand-ins through `moduleNameMapper`; never `jest.mock()`. esbuild-jest hands any file containing the text `ock(` to Babel: do not name anything `codeBlock(`, `getBlock(` and so on.
- jsdom has no layout: tests fake `scrollHeight`, `clientHeight` and `scrollTop` with `Object.defineProperty`; any `scrollTop` they define must be `writable: true`.
- userEvent installs its own clipboard stub: test copy buttons with `fireEvent.click` after `Object.assign(navigator, { clipboard: { writeText } })`. `@mantine-tests/core` does not re-export `fireEvent`; import it from `@testing-library/react`.
- `MessageList` is used as `<MessageList<AssistantMessage> ...>` (the generic cast pattern from phase 1).
- Show output in Steve's watch tab: wrap commands as `{ printf '\n$ CMD\n'; CMD 2>&1; } | tee -a .claude/run.log`.
- Format before testing: `npx oxfmt -c oxfmt.config.mjs --write package/src docs test-utils scripts`.
- Work on a branch: `git switch -c feat/assistant` before Task 1. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Phase 2 (team chat) runs in parallel and also touches `Composer.tsx`, `ChatThread.tsx`, `types.ts`, `Messages.story.tsx`, `docs/docs.mdx`, `docs/styles-api/index.ts`, `docs/pages/index.tsx`, `scripts/docgen.ts` and `CHANGELOG.md`. Every change here is additive; if phase 2 lands first, rebase and keep both sides.

## File map

| File | Responsibility |
|---|---|
| `package/src/types.ts` | gains `AssistantPart`, `AssistantMessage` |
| `package/src/icons.tsx` | gains `ChevronIcon`, `RegenerateIcon` |
| `package/src/MessageList/use-message-list.ts` | follows the last item while it grows at the bottom |
| `package/src/Composer/Composer.tsx` | `streaming` and `onStop`: Stop replaces Send |
| `package/src/ChatThread/ChatThread.tsx`, `.module.css` | `renderBody`; links and code readable in own bubbles |
| `test-utils/react-markdown.mock.tsx`, `test-utils/remark-gfm.mock.ts` (new) | Jest stand-ins for the ESM-only peers |
| `package/src/MarkdownBody/MarkdownBody.tsx`, `.module.css` (new) | Safe markdown with Mantine typography, links and code blocks |
| `package/src/markdown.ts` (new) | Entry of `mantine-messages/markdown` |
| `package/src/AssistantThread/assistant-text.ts` (new) | `getAssistantText`, `formatJson` |
| `package/src/AssistantThread/AssistantThread.tsx`, `.module.css` (new) | Prompts, answers, parts, streaming, actions, editor, announcer |
| `package/src/assistant.ts` (new) | Entry of `mantine-messages/assistant` |
| `rollup.config.mjs`, `scripts/generate-dts.ts`, `package/package.json` | Three entries, their types and exports; optional peers |
| `scripts/check-root-peers.ts` (new), `package.json` | The root-bundle peer check, run by `npm test` |
| `jest.config.cjs`, `tsconfig.json` | Stand-in mapping; typecheck `test-utils` |
| `package/src/Assistant.story.tsx` (new), `package/src/Messages.story.tsx` | Streaming story driven by a fake token stream; markdown in chat |
| `docs/demos/Assistant.demo.tsx` (new), `docs/demos/index.ts`, `docs/docs.mdx`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `scripts/docgen.ts`, `CHANGELOG.md`, `README.md` | Docs |

---

### Task 1: Assistant types and icons

**Files:**
- Modify: `package/src/types.ts`, `package/src/types.test.ts`, `package/src/icons.tsx`, `package/src/icons.test.tsx`

**Interfaces:**
- Produces:
  - `type AssistantPart = { type: 'text'; text: string; state?: 'streaming' | 'done' } | { type: 'reasoning'; text: string; state?: 'streaming' | 'done' } | { type: 'tool'; name: string; input: unknown; output?: unknown; state: 'running' | 'done' | 'error' }`
  - `interface AssistantMessage extends MessageBase { role: 'user' | 'assistant'; parts: AssistantPart[]; status?: 'streaming' | 'done' | 'error'; error?: string }`
  - `ChevronIcon`, `RegenerateIcon`: `(props: { size?: number }) => JSX.Element`, default size 16, `aria-hidden`.
  - Both types are exported from the root through the existing `export type * from './types'`.

- [ ] **Step 1: Write failing tests**

In `package/src/types.test.ts` change the import to:

```ts
import type {
  AssistantMessage,
  ChatMessage,
  Conversation,
  MessageBase,
  SystemEvent,
} from './types';
```

and add a second test inside `describe('types', ...)`:

```ts
  it('builds assistant prompts and answers from parts', () => {
    const answer: AssistantMessage = {
      id: 'a1',
      authorId: 'assistant',
      createdAt: 0,
      role: 'assistant',
      status: 'error',
      error: 'Timed out',
      parts: [
        { type: 'reasoning', text: 'Thinking', state: 'done' },
        { type: 'tool', name: 'search', input: { q: 'x' }, output: [], state: 'done' },
        { type: 'text', text: '**Hi**', state: 'streaming' },
      ],
    };

    expect(answer.parts.map((part) => part.type)).toEqual(['reasoning', 'tool', 'text']);
  });
```

In `package/src/icons.test.tsx` add inside `describe('icons', ...)`:

```tsx
  it('has the icons the assistant uses', () => {
    expect(Object.keys(icons)).toEqual(expect.arrayContaining(['ChevronIcon', 'RegenerateIcon']));
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx tsc --noEmit; npx jest package/src/icons`
Expected: tsc reports `Module '"./types"' has no exported member 'AssistantMessage'`; Jest FAIL, `has the icons the assistant uses` (array does not contain `ChevronIcon`).

- [ ] **Step 3: Implement**

Append to `package/src/types.ts`:

```ts
/** One piece of an assistant answer; parts render in order */
export type AssistantPart =
  | {
      type: 'text';

      /** Markdown */
      text: string;

      /** `'streaming'` while tokens arrive: a cursor blinks at its end */
      state?: 'streaming' | 'done';
    }
  | {
      type: 'reasoning';
      text: string;
      state?: 'streaming' | 'done';
    }
  | {
      type: 'tool';

      /** Tool name, for example `'search_docs'` */
      name: string;
      input: unknown;
      output?: unknown;
      state: 'running' | 'done' | 'error';
    };

/** A prompt (`role: 'user'`) or an answer (`role: 'assistant'`) in AssistantThread */
export interface AssistantMessage extends MessageBase {
  role: 'user' | 'assistant';
  parts: AssistantPart[];

  /** `'streaming'` while the answer is generated; `'error'` shows an alert */
  status?: 'streaming' | 'done' | 'error';

  /** What went wrong, shown in the alert when `status` is `'error'` */
  error?: string;
}
```

Append to `package/src/icons.tsx`:

```tsx
export const ChevronIcon = icon(['m9 18 6-6-6-6']);
export const RegenerateIcon = icon(['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6']);
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add AssistantMessage and AssistantPart types, chevron and regenerate icons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `MessageList` follows the last item while it grows

**Files:**
- Modify: `package/src/MessageList/use-message-list.ts`, `package/src/MessageList/MessageList.scroll.test.tsx`

**Interfaces:**
- Consumes: `useMessageList` (phase 1).
- Produces: no new API. Behaviour: when a render keeps the same first and last ids but `scrollHeight` grew, and `autoScroll` is on and the user was at the bottom, `scrollTop` is set to `scrollHeight` (instant).

- [ ] **Step 1: Write the failing tests**

Add inside `describe('MessageList scrolling', ...)` in `package/src/MessageList/MessageList.scroll.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest package/src/MessageList/MessageList.scroll`
Expected: FAIL, `follows the newest item while it grows...`: `Expected: 1300, Received: 800`.

- [ ] **Step 3: Implement**

In `package/src/MessageList/use-message-list.ts` replace:

```ts
    if (firstId === before.first && lastId === before.last) {
      return;
    }
```

with:

```ts
    if (firstId === before.first && lastId === before.last) {
      // Same items, but the newest may have grown, for example an answer streaming in
      if (autoScroll && atBottom.current && viewport.scrollHeight > before.height) {
        viewport.scrollTop = viewport.scrollHeight;
      }

      return;
    }
```

and in the hook's doc comment replace `follows new items while the` with `follows new items, and the newest one as it grows, while the`.

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npm run coverage`
Expected: all pass (every existing MessageList and ChatThread scroll test unchanged), 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Follow the newest message while it grows at the bottom

Streaming answers keep their id and grow; the list now stays pinned to them.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `Composer` Stop button

**Files:**
- Modify: `package/src/Composer/Composer.tsx`, `package/src/Composer/Composer.test.tsx`

**Interfaces:**
- Produces on `ComposerProps`: `streaming?: boolean` (an answer is being generated: the send button becomes a stop button, Enter does not send, the text stays), `onStop?: () => void`. `ComposerLabels` gains `stop: string` (default `'Stop'`). The button keeps the Styles API part `send` and gets `data-streaming` while streaming.

- [ ] **Step 1: Write the failing test**

Add inside `describe('Composer', ...)` in `package/src/Composer/Composer.test.tsx`:

```tsx
  it('turns send into stop while an answer streams, and keeps the text', async () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    render(<Composer onSend={onSend} onStop={onStop} streaming labels={{ stop: 'Stop answer' }} />);
    const stop = screen.getByRole('button', { name: 'Stop answer' });
    expect(stop).toBeEnabled();
    expect(stop).toHaveAttribute('data-streaming');

    await userEvent.type(screen.getByRole('textbox'), 'next question{Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('next question');

    await userEvent.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/Composer`
Expected: FAIL, `Unable to find an accessible element with the role "button" and name "Stop answer"`.

- [ ] **Step 3: Implement**

In `package/src/Composer/Composer.tsx`:

Add to `ComposerLabels` after `cancelReply`:

```ts
  /** Accessible label of the stop button shown while `streaming` */
  stop: string;
```

Add to `ComposerProps` after `maxRows`:

```ts
  /** An answer is being generated: the send button becomes a stop button and Enter does not send */
  streaming?: boolean;

  /** Called when the user clicks the stop button */
  onStop?: () => void;
```

In `defaultLabels` add `stop: 'Stop',` after `cancelReply: 'Cancel reply',`.

After the `SendIcon` function add:

```tsx
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}
```

In the destructuring add `streaming,` and `onStop,` after `maxRows,`.

Replace `const canSend = !disabled && text.trim().length > 0;` with:

```ts
  const canSend = !disabled && !streaming && text.trim().length > 0;
```

Replace the send `ActionIcon` element with:

```tsx
        <ActionIcon
          radius="xl"
          size="lg"
          aria-label={streaming ? allLabels.stop : allLabels.send}
          disabled={!streaming && !canSend}
          onClick={streaming ? onStop : send}
          mod={{ streaming }}
          {...getStyles('send')}
        >
          {streaming ? <StopIcon /> : <SendIcon />}
        </ActionIcon>
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run coverage`
Expected: all pass, 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Composer: streaming and onStop turn Send into Stop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `ChatThread.renderBody`

**Files:**
- Modify: `package/src/ChatThread/ChatThread.tsx`, `package/src/ChatThread/ChatThread.module.css`, `package/src/ChatThread/ChatThread.test.tsx`

**Interfaces:**
- Produces on `ChatThreadProps`: `renderBody?: (message: ChatMessage) => React.ReactNode` (what the bubble shows; `message.body` as plain text by default). The root entry still never imports `MarkdownBody`; apps write `renderBody={(m) => m.format === 'markdown' ? <MarkdownBody>{m.body}</MarkdownBody> : m.body}`.

- [ ] **Step 1: Write the failing test**

Add inside `describe('ChatThread', ...)` in `package/src/ChatThread/ChatThread.test.tsx`:

```tsx
  it('renders bodies through renderBody, for example markdown', () => {
    render(
      <ChatThread
        {...defaultProps}
        renderBody={(message) => (
          <strong data-testid={`body-${message.id}`}>{message.body.toUpperCase()}</strong>
        )}
      />
    );
    expect(screen.getByTestId('body-a')).toHaveTextContent('HI THERE');
    expect(screen.getByTestId('body-a').closest('.mantine-ChatThread-bubble')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest package/src/ChatThread/ChatThread.test`
Expected: FAIL, `Unable to find an element by: [data-testid="body-a"]` (and tsc would report `Property 'renderBody' does not exist`).

- [ ] **Step 3: Implement**

In `package/src/ChatThread/ChatThread.tsx`:

Add to `ChatThreadProps` after `withAuthors`:

```ts
  /**
   * Renders the body of a message, for example markdown with `MarkdownBody` from
   * `mantine-messages/markdown`; the plain `body` by default
   */
  renderBody?: (message: ChatMessage) => React.ReactNode;
```

Add `renderBody,` to the destructuring after `withAuthors,`.

In the bubble replace `{message.body}` with:

```tsx
                  {renderBody ? renderBody(message) : message.body}
```

In `package/src/ChatThread/ChatThread.module.css`, inside `.bubble`, after the `&[data-own] { ... }` block add:

```css
  /* Markdown from renderBody: links and code stay readable on the filled bubble */
  &[data-own] :where(a, code) {
    color: inherit;
  }

  &[data-own] :where(a) {
    text-decoration: underline;
  }

  &[data-own] :where(code) {
    background-color: alpha(var(--mantine-color-white), 0.2);
  }
```

- [ ] **Step 4: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run stylelint && npm run coverage`
Expected: all pass (every existing ChatThread test unchanged), 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ChatThread: renderBody, so apps can render markdown without the root importing it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Optional peers, Jest stand-ins and `MarkdownBody`

**Files:**
- Modify: `package.json` (root devDependencies, by yarn), `docs/package.json` (dependencies, by yarn), `package/package.json` (peers), `yarn.lock`, `jest.config.cjs`, `tsconfig.json`
- Create: `test-utils/react-markdown.mock.tsx`, `test-utils/remark-gfm.mock.ts`, `package/src/MarkdownBody/MarkdownBody.tsx`, `package/src/MarkdownBody/MarkdownBody.module.css`, `package/src/MarkdownBody/MarkdownBody.test.tsx`, `package/src/markdown.ts`, `package/src/markdown.test.ts`

**Interfaces:**
- Consumes: `CheckIcon`, `CopyIcon` (`icons.tsx`).
- Produces:
  - `MarkdownBody` (factory, ref `HTMLDivElement`), `MarkdownBodyProps extends BoxProps, StylesApiProps<MarkdownBodyFactory>, ElementProps<'div', 'children'>`: `children: string`, `components?: Components` (react-markdown; replaces the built-in `a`, `code`, `pre`), `remarkPlugins?: Options['remarkPlugins']` (run after remark-gfm), `labels?: Partial<MarkdownBodyLabels>`
  - `MarkdownBodyLabels { copyCode: string; copied: string; opensInNewTab: string }` (defaults `'Copy code'`, `'Copied'`, `'(opens in a new tab)'`)
  - `MarkdownBodyStylesNames = 'root' | 'link' | 'code' | 'codeBlock' | 'codeHeader' | 'copy' | 'pre'`
  - `MarkdownBodyFactory`
  - Entry `package/src/markdown.ts` exporting `MarkdownBody` and those types.
  - Test stand-ins: `markdownRenders: Options[]` (every render of the stand-in, newest last) from `test-utils/react-markdown.mock.tsx`; default `remarkGfm` from `test-utils/remark-gfm.mock.ts`.

- [ ] **Step 1: Install the peers (versions checked with `npm view` on 2026-11-15: react-markdown 10.1.0, peer `react >=18`; remark-gfm 4.0.1; both `"type": "module"`)**

```bash
yarn add -D react-markdown@^10.1.0 remark-gfm@^4.0.1
yarn workspace mantine-messages-docs add react-markdown@^10.1.0 remark-gfm@^4.0.1
```

Then in `package/package.json` replace the `peerDependencies` block with:

```json
  "peerDependencies": {
    "@mantine/core": ">=9.0.0",
    "@mantine/hooks": ">=9.0.0",
    "react": "^18.x || ^19.x",
    "react-dom": "^18.x || ^19.x",
    "react-markdown": "^10.0.0",
    "remark-gfm": "^4.0.0"
  },
  "peerDependenciesMeta": {
    "react-markdown": {
      "optional": true
    },
    "remark-gfm": {
      "optional": true
    }
  },
```

and run `yarn` so `yarn.lock` records the workspace's new peers. Run `npm run syncpack`; expected: no mismatches (root `^10.1.0`/`^4.0.1` dev and docs `^10.1.0`/`^4.0.1` prod match; peers are not compared).

- [ ] **Step 2: Jest stand-ins**

`test-utils/remark-gfm.mock.ts`:

```ts
/** remark-gfm is ESM only and Jest runs CommonJS; MarkdownBody tests only check it is passed */
export default function remarkGfm() {}
```

`test-utils/react-markdown.mock.tsx`:

```tsx
import React from 'react';
import type { Components, Options } from 'react-markdown';

/**
 * react-markdown is ESM only and Jest runs CommonJS, so tests get this stand-in (see
 * jest.config.cjs). It understands just enough markdown to call the components it is given:
 * fenced code blocks, inline code and links. The real rendering is checked in Storybook.
 */

/** Options of every render, newest last; tests empty it in beforeEach */
export const markdownRenders: Options[] = [];

const TOKENS = /```(\w*)\n([\s\S]*?)```|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

export default function Markdown(options: Options) {
  markdownRenders.push(options);
  const components: Components = options.components ?? {};
  const element = (tag: 'a' | 'code' | 'pre', props: Record<string, unknown>, key?: number) => {
    const Component = (components[tag] ?? tag) as React.ElementType;
    return <Component key={key} {...props} />;
  };

  const text = options.children ?? '';
  const output: React.ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKENS)) {
    const [whole, language, code, inline, label, href] = match;
    output.push(text.slice(last, match.index));

    if (code !== undefined) {
      const className = language ? `language-${language}` : undefined;
      output.push(element('pre', { children: element('code', { className, children: code }) }, match.index));
    } else if (inline !== undefined) {
      output.push(element('code', { children: inline }, match.index));
    } else {
      output.push(element('a', { href, children: label }, match.index));
    }

    last = match.index! + whole.length;
  }

  output.push(text.slice(last));
  return <div data-testid="markdown">{output}</div>;
}

export const defaultUrlTransform = (url: string) => url;
```

In `jest.config.cjs` replace the `moduleNameMapper` block with:

```js
  moduleNameMapper: {
    // react-markdown and remark-gfm are ESM only and Jest runs CommonJS: tests get stand-ins
    '^react-markdown$': '<rootDir>/test-utils/react-markdown.mock.tsx',
    '^remark-gfm$': '<rootDir>/test-utils/remark-gfm.mock.ts',
    '\\.(css)$': 'identity-obj-proxy',
  },
```

In `tsconfig.json` change `"include": ["package", "scripts", "@types"]` to `"include": ["package", "scripts", "@types", "test-utils"]`.

- [ ] **Step 3: Write the failing tests**

`package/src/MarkdownBody/MarkdownBody.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import remarkGfm from '../../../test-utils/remark-gfm.mock';
import { MarkdownBody, MarkdownBodyProps, MarkdownBodyStylesNames } from './MarkdownBody';

const source = 'See [the docs](https://mantine.dev) and `useState`.\n\n```tsx\nconst a = 1;\n```\n';

const defaultProps: MarkdownBodyProps = { children: source };

beforeEach(() => {
  markdownRenders.length = 0;
});

describe('MarkdownBody', () => {
  tests.itSupportsSystemProps<MarkdownBodyProps, MarkdownBodyStylesNames>({
    component: MarkdownBody,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MarkdownBody',
    stylesApiSelectors: ['root', 'link', 'code', 'codeBlock', 'codeHeader', 'copy', 'pre'],
  });

  it('renders GitHub flavoured markdown and offers no way to turn raw HTML into elements', () => {
    render(<MarkdownBody>{source}</MarkdownBody>);
    const options = markdownRenders.at(-1)!;
    expect(options.children).toBe(source);
    expect(options.remarkPlugins).toEqual([remarkGfm]);
    expect('rehypePlugins' in options).toBe(false);
    expect('skipHtml' in options).toBe(false);
    expect('urlTransform' in options).toBe(false);
  });

  it('runs the app’s remark plugins after remark-gfm', () => {
    const plugin = () => undefined;
    render(<MarkdownBody remarkPlugins={[plugin]}>x</MarkdownBody>);
    expect(markdownRenders.at(-1)!.remarkPlugins).toEqual([remarkGfm, plugin]);
  });

  it('opens links in a new tab without a referrer, and says so', () => {
    render(<MarkdownBody labels={{ opensInNewTab: '(new tab)' }}>{source}</MarkdownBody>);
    const link = screen.getByRole('link', { name: 'the docs (new tab)' });
    expect(link).toHaveAttribute('href', 'https://mantine.dev');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows inline code, and code blocks with their language and without the last newline', () => {
    const { container } = render(<MarkdownBody>{source}</MarkdownBody>);
    expect(screen.getByText('useState').tagName).toBe('CODE');
    expect(screen.getByText('tsx')).toBeInTheDocument();
    expect(container.querySelector('pre')!.textContent).toBe('const a = 1;');
  });

  it('copies a code block and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MarkdownBody labels={{ copied: 'Copied!' }}>{source}</MarkdownBody>);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('shows no language for a plain code block, and takes custom components', () => {
    const { container } = render(
      <MarkdownBody components={{ a: ({ children }) => <b>{children}</b> }}>
        {'```\nplain\n```\n[bold link](https://x.dev)'}
      </MarkdownBody>
    );
    expect(container.querySelector('.mantine-MarkdownBody-codeHeader')!.textContent).toBe('');
    expect(screen.getByText('bold link').tagName).toBe('B');
  });
});
```

`package/src/markdown.test.ts`:

```ts
import * as markdown from './markdown';

describe('mantine-messages/markdown', () => {
  it('exports MarkdownBody', () => {
    expect(Object.keys(markdown).sort()).toEqual(['MarkdownBody']);
    expect(Object.values(markdown).every((value) => value !== undefined)).toBe(true);
  });
});
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx jest package/src/MarkdownBody package/src/markdown`
Expected: FAIL, `Cannot find module './MarkdownBody'` and `Cannot find module './markdown'`.

- [ ] **Step 5: Implement**

`package/src/MarkdownBody/MarkdownBody.tsx`:

```tsx
import {
  ActionIcon,
  Anchor,
  Box,
  BoxProps,
  Code,
  CopyButton,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  Text,
  Typography,
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import React, { createContext, useContext } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckIcon, CopyIcon } from '../icons';
import classes from './MarkdownBody.module.css';

export type MarkdownBodyStylesNames =
  | 'root'
  | 'link'
  | 'code'
  | 'codeBlock'
  | 'codeHeader'
  | 'copy'
  | 'pre';

export interface MarkdownBodyLabels {
  /** Accessible label of the copy button on code blocks */
  copyCode: string;

  /** Label of the copy button for a moment after copying */
  copied: string;

  /** Hidden text after each link, which opens in a new tab */
  opensInNewTab: string;
}

export interface MarkdownBodyProps
  extends BoxProps, StylesApiProps<MarkdownBodyFactory>, ElementProps<'div', 'children'> {
  /** Markdown; raw HTML in it shows as text and never becomes elements */
  children: string;

  /**
   * Renderers by tag name, replacing the built-in ones for links (`a`), inline code (`code`) and
   * code blocks (`pre`), for example `pre` with `@mantine/code-highlight`
   */
  components?: Components;

  /** Remark plugins, run after remark-gfm */
  remarkPlugins?: Options['remarkPlugins'];

  /** Text, for translation */
  labels?: Partial<MarkdownBodyLabels>;
}

export type MarkdownBodyFactory = Factory<{
  props: MarkdownBodyProps;
  ref: HTMLDivElement;
  stylesNames: MarkdownBodyStylesNames;
}>;

const defaultProps: Partial<MarkdownBodyProps> = {};

const defaultLabels: MarkdownBodyLabels = {
  copyCode: 'Copy code',
  copied: 'Copied',
  opensInNewTab: '(opens in a new tab)',
};

// The renderers below are module-level components, so their identity never changes between
// renders (a new component type would remount every code block); styles and labels reach them
// through this context
const MarkdownBodyContext = createContext<{
  getStyles: GetStylesApi<MarkdownBodyFactory>;
  labels: MarkdownBodyLabels;
} | null>(null);

const useMarkdownBodyContext = () => useContext(MarkdownBodyContext)!;

function MarkdownLink({ href, children }: React.ComponentPropsWithoutRef<'a'>) {
  const { getStyles, labels } = useMarkdownBodyContext();

  return (
    <Anchor href={href} target="_blank" rel="noreferrer" {...getStyles('link')}>
      {children}
      <VisuallyHidden> {labels.opensInNewTab}</VisuallyHidden>
    </Anchor>
  );
}

function MarkdownCode({ children }: React.ComponentPropsWithoutRef<'code'>) {
  const { getStyles } = useMarkdownBodyContext();
  return <Code {...getStyles('code')}>{children}</Code>;
}

/** A fenced code block: react-markdown passes a `<code class="language-x">` element as the child */
function MarkdownPre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
  const { getStyles, labels } = useMarkdownBodyContext();
  const code = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  const text = React.Children.toArray(code.props.children).join('').replace(/\n$/, '');
  const language = /language-(\S+)/.exec(code.props.className ?? '')?.[1];

  return (
    <Box {...getStyles('codeBlock')}>
      <Box {...getStyles('codeHeader')}>
        <Text component="span" size="xs" c="dimmed" ff="monospace">
          {language}
        </Text>
        <CopyButton value={text} timeout={1500}>
          {({ copied, copy }) => (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={copied ? labels.copied : labels.copyCode}
              onClick={copy}
              {...getStyles('copy')}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </ActionIcon>
          )}
        </CopyButton>
      </Box>
      <Code block {...getStyles('pre')}>
        {text}
      </Code>
    </Box>
  );
}

const defaultComponents: Components = { a: MarkdownLink, code: MarkdownCode, pre: MarkdownPre };

export const MarkdownBody = factory<MarkdownBodyFactory>((_props) => {
  const props = useProps('MarkdownBody', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    children,
    components,
    remarkPlugins,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<MarkdownBodyFactory>({
    name: 'MarkdownBody',
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
    <MarkdownBodyContext.Provider value={{ getStyles, labels: { ...defaultLabels, ...labels } }}>
      <Typography ref={ref} {...getStyles('root')} {...others}>
        <Markdown
          remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
          components={{ ...defaultComponents, ...components }}
        >
          {children}
        </Markdown>
      </Typography>
    </MarkdownBodyContext.Provider>
  );
});

MarkdownBody.displayName = 'MarkdownBody';
MarkdownBody.classes = classes;
```

`package/src/MarkdownBody/MarkdownBody.module.css`:

```css
.root {
  min-width: 0;
  font-size: inherit;
  line-height: 1.6;
  white-space: normal;
  overflow-wrap: anywhere;

  /* Typography spaces paragraphs for articles; messages are tighter */
  & :where(p, ul, ol, blockquote, table) {
    margin-bottom: var(--mantine-spacing-sm);
  }

  /* Wide tables scroll instead of widening the message */
  & :where(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
}

.codeBlock {
  margin-block: var(--mantine-spacing-sm);
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-md);
  overflow: hidden;
}

/* Language on the left, copy button on the right */
.codeHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  padding: 2px 4px 2px 12px;
  border-bottom: 1px solid var(--mantine-color-default-border);

  @mixin light {
    background-color: var(--mantine-color-gray-0);
  }

  @mixin dark {
    background-color: var(--mantine-color-dark-7);
  }
}

.pre {
  margin: 0;
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-md);
  border-radius: 0;
  overflow-x: auto;
  white-space: pre;
}
```

`package/src/markdown.ts`:

```ts
export { MarkdownBody } from './MarkdownBody/MarkdownBody';
export type {
  MarkdownBodyProps,
  MarkdownBodyFactory,
  MarkdownBodyStylesNames,
  MarkdownBodyLabels,
} from './MarkdownBody/MarkdownBody';
```

- [ ] **Step 6: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src test-utils && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%. (`npm run build` is not needed yet: `markdown.ts` joins the build in Task 7.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add MarkdownBody with react-markdown and remark-gfm as optional peers

Links open in a new tab with rel=noreferrer, raw HTML stays text, code blocks get a
language label and a copy button. Jest maps the ESM-only peers to stand-ins.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `AssistantThread`

**Files:**
- Create: `package/src/AssistantThread/assistant-text.ts`, `package/src/AssistantThread/assistant-text.test.ts`, `package/src/AssistantThread/AssistantThread.tsx`, `package/src/AssistantThread/AssistantThread.module.css`, `package/src/AssistantThread/AssistantThread.test.tsx`, `package/src/AssistantThread/AssistantThread.actions.test.tsx`, `package/src/assistant.ts`, `package/src/assistant.test.ts`

**Interfaces:**
- Consumes: `AssistantMessage`, `AssistantPart` (Task 1); `ChevronIcon`, `RegenerateIcon` (Task 1); growth-following `MessageList` (Task 2); `MarkdownBody` (Task 5); `MessageActions`, `MessageAction` (phase 1); `markdownRenders` (Task 5 stand-in).
- Produces:
  - `getAssistantText(message: Pick<AssistantMessage, 'parts'>): string`: text parts joined by a blank line (reasoning and tools left out)
  - `formatJson(value: unknown): string`: strings as they are, anything else as 2-space JSON
  - `AssistantThread` (factory, ref `HTMLDivElement`, the inner ScrollArea), `AssistantThreadProps extends BoxProps, StylesApiProps<AssistantThreadFactory>, ElementProps<'div'>`: `messages: AssistantMessage[]`, `autoScroll?: boolean` (default `true`), `onRegenerate?: (message: AssistantMessage) => void`, `onEdit?: (message: AssistantMessage, text: string) => void`, `labels?: Partial<AssistantThreadLabels>`
  - `AssistantThreadLabels { copy; copied; edit; regenerate; retry; error; thinking; thoughts; running; done; failed; input; output; editPrompt; cancel; send }` (all `string`)
  - `AssistantThreadStylesNames = 'root' | 'list' | 'item' | 'turn' | 'bubble' | 'answer' | 'text' | 'thinking' | 'step' | 'stepHeader' | 'stepBody' | 'stepCode' | 'error' | 'actions' | 'editor'`
  - Modifiers: `data-role` (`user` / `assistant`) and `data-status` on `turn`; `data-streaming` on `text`; `data-expanded` on `stepHeader`.
  - Entry `package/src/assistant.ts` exporting `AssistantThread`, `getAssistantText` and the types above.

- [ ] **Step 1: Write the failing helper and entry tests**

`package/src/AssistantThread/assistant-text.test.ts`:

```ts
import { formatJson, getAssistantText } from './assistant-text';

describe('assistant text', () => {
  it('joins text parts with blank lines and leaves out reasoning and tools', () => {
    expect(
      getAssistantText({
        parts: [
          { type: 'reasoning', text: 'hidden', state: 'done' },
          { type: 'text', text: 'One' },
          { type: 'tool', name: 'search', input: {}, state: 'done' },
          { type: 'text', text: 'Two' },
        ],
      })
    ).toBe('One\n\nTwo');
  });

  it('shows strings as they are and anything else as indented JSON', () => {
    expect(formatJson('plain')).toBe('plain');
    expect(formatJson({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}');
  });
});
```

`package/src/assistant.test.ts`:

```ts
import * as assistant from './assistant';

describe('mantine-messages/assistant', () => {
  it('exports AssistantThread and getAssistantText', () => {
    expect(Object.keys(assistant).sort()).toEqual(['AssistantThread', 'getAssistantText']);
    expect(Object.values(assistant).every((value) => value !== undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Write the failing render tests**

`package/src/AssistantThread/AssistantThread.test.tsx`:

```tsx
import { render, screen, tests } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import type { AssistantMessage } from '../types';
import {
  AssistantThread,
  AssistantThreadProps,
  AssistantThreadStylesNames,
} from './AssistantThread';

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const prompt: AssistantMessage = {
  id: 'p1',
  authorId: 'me',
  role: 'user',
  createdAt: at(0),
  parts: [{ type: 'text', text: 'Write a debounce hook' }],
};

const answer: AssistantMessage = {
  id: 'a1',
  authorId: 'assistant',
  role: 'assistant',
  createdAt: at(1),
  status: 'done',
  parts: [
    { type: 'reasoning', text: 'The user wants a hook.', state: 'done' },
    {
      type: 'tool',
      name: 'search_docs',
      input: { query: 'debounce' },
      output: { hits: 2 },
      state: 'done',
    },
    { type: 'text', text: 'Here it is.', state: 'done' },
  ],
};

const defaultProps: AssistantThreadProps = { messages: [prompt, answer] };

beforeEach(() => {
  markdownRenders.length = 0;
});

/** Keeps messages in state, so updates re-render the thread but not the MantineProvider around it */
function setup(initial: AssistantMessage[], props: Partial<AssistantThreadProps> = {}) {
  let update: (messages: AssistantMessage[]) => void = () => {};

  function Harness() {
    const [messages, setMessages] = useState(initial);
    update = setMessages;
    return <AssistantThread messages={messages} {...props} />;
  }

  const view = render(<Harness />);
  return { ...view, update: (messages: AssistantMessage[]) => act(() => update(messages)) };
}

describe('AssistantThread', () => {
  tests.itSupportsSystemProps<AssistantThreadProps, AssistantThreadStylesNames>({
    component: AssistantThread,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'AssistantThread',
    stylesApiSelectors: [
      'root',
      'list',
      'item',
      'turn',
      'bubble',
      'answer',
      'text',
      'step',
      'stepHeader',
      'actions',
    ],
  });

  it('shows prompts as bubbles and answers full width, in a log that does not read tokens', () => {
    render(<AssistantThread {...defaultProps} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
    expect(screen.getByText('Write a debounce hook')).toHaveClass('mantine-AssistantThread-bubble');
    expect(screen.getByText('Here it is.').closest('[data-role]')).toHaveAttribute(
      'data-role',
      'assistant'
    );
  });

  it('renders an empty log without messages', () => {
    render(<AssistantThread messages={[]} />);
    expect(screen.getByRole('log')).toBeEmptyDOMElement();
  });

  it('renders parts in order, with reasoning and tools as collapsible steps', async () => {
    render(<AssistantThread {...defaultProps} labels={{ thoughts: 'Reasoning' }} />);
    const reasoning = screen.getByRole('button', { name: 'Reasoning' });
    expect(reasoning).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('The user wants a hook.')).not.toBeInTheDocument();
    expect(reasoning.compareDocumentPosition(screen.getByTestId('markdown'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    await userEvent.click(reasoning);
    expect(await screen.findByText('The user wants a hook.')).toBeInTheDocument();
    expect(reasoning).toHaveAttribute('aria-expanded', 'true');
    expect(reasoning).toHaveAttribute('data-expanded');

    const tool = screen.getByRole('button', { name: /search_docs/ });
    expect(tool).toHaveTextContent('Done');
    await userEvent.click(tool);
    expect(await screen.findByText(/"query": "debounce"/)).toBeInTheDocument();
    expect(screen.getByText(/"hits": 2/)).toBeInTheDocument();

    await userEvent.click(reasoning);
    expect(reasoning).toHaveAttribute('aria-expanded', 'false');
  });

  it('labels running and failed tools, and shows an input without output', async () => {
    render(
      <AssistantThread
        messages={[
          prompt,
          {
            ...answer,
            status: 'streaming',
            parts: [
              { type: 'tool', name: 'fetch_page', input: 'https://mantine.dev', state: 'running' },
              { type: 'tool', name: 'run_tests', input: {}, state: 'error' },
            ],
          },
        ]}
        labels={{ running: 'Working', failed: 'Broke', input: 'Args' }}
      />
    );
    expect(screen.getByRole('button', { name: /fetch_page/ })).toHaveTextContent('Working');
    expect(screen.getByRole('button', { name: /run_tests/ })).toHaveTextContent('Broke');

    await userEvent.click(screen.getByRole('button', { name: /fetch_page/ }));
    expect(await screen.findByText('https://mantine.dev')).toBeInTheDocument();
    expect(screen.getByText('Args')).toBeInTheDocument();
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });

  it('waits, streams with a cursor, and announces only the finished answer', () => {
    const streaming: AssistantMessage = { ...answer, status: 'streaming', parts: [] };
    const { update, container } = setup([prompt, streaming], {
      labels: { thinking: 'Working on it' },
    });
    const status = screen.getByRole('status');
    expect(screen.getByLabelText('Working on it')).toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();

    update([
      prompt,
      {
        ...streaming,
        parts: [
          { type: 'reasoning', text: 'Hmm', state: 'streaming' },
          { type: 'text', text: 'Here', state: 'streaming' },
        ],
      },
    ]);
    expect(screen.queryByLabelText('Working on it')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Working on it' })).toBeInTheDocument();
    expect(container.querySelector('.mantine-AssistantThread-text')).toHaveAttribute(
      'data-streaming'
    );
    expect(status).toBeEmptyDOMElement();

    update([
      prompt,
      { ...streaming, status: 'done', parts: [{ type: 'text', text: 'Here it is.', state: 'done' }] },
    ]);
    expect(container.querySelector('.mantine-AssistantThread-text')).not.toHaveAttribute(
      'data-streaming'
    );
    expect(status).toHaveTextContent('Here it is.');
  });

  it('does not announce answers that were finished before', () => {
    render(<AssistantThread {...defaultProps} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows an alert with the error', () => {
    render(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'error', error: 'Rate limited', parts: [] }]}
        labels={{ error: 'No answer' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No answer');
    expect(screen.getByRole('alert')).toHaveTextContent('Rate limited');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('renders a finished text part once while a later part streams', () => {
    const parts = (tail: string): AssistantMessage['parts'] => [
      { type: 'text', text: 'Finished part', state: 'done' },
      { type: 'tool', name: 'search', input: {}, state: 'done' },
      { type: 'text', text: tail, state: 'streaming' },
    ];
    const { update } = setup([prompt, { ...answer, status: 'streaming', parts: parts('A') }]);
    update([prompt, { ...answer, status: 'streaming', parts: parts('A b') }]);
    update([prompt, { ...answer, status: 'streaming', parts: parts('A b c') }]);

    const renders = (text: string) =>
      markdownRenders.filter((options) => options.children === text).length;
    expect(renders('Finished part')).toBe(1);
    expect(renders('A b c')).toBe(1);
  });
});
```

`package/src/AssistantThread/AssistantThread.actions.test.tsx`:

```tsx
import { render, screen } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AssistantMessage } from '../types';
import { AssistantThread } from './AssistantThread';

const prompt: AssistantMessage = {
  id: 'p1',
  authorId: 'me',
  role: 'user',
  createdAt: new Date(2026, 10, 15, 9),
  parts: [{ type: 'text', text: 'Write a debounce hook' }],
};

const answer: AssistantMessage = {
  id: 'a1',
  authorId: 'assistant',
  role: 'assistant',
  createdAt: new Date(2026, 10, 15, 9, 1),
  status: 'done',
  parts: [{ type: 'text', text: 'Here it is.', state: 'done' }],
};

describe('AssistantThread actions', () => {
  it('copies answers and prompts, and regenerates only the last answer', async () => {
    const onRegenerate = jest.fn();
    const older: AssistantMessage = {
      ...answer,
      id: 'a0',
      parts: [{ type: 'text', text: 'Older answer' }],
    };
    render(
      <AssistantThread
        messages={[older, prompt, answer]}
        onRegenerate={onRegenerate}
        labels={{ regenerate: 'Try again' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Copy: Older answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy: Write a debounce hook' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again: Older answer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit:/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again: Here it is.' }));
    expect(onRegenerate).toHaveBeenCalledWith(answer);
  });

  it('copies the text parts of an answer', () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<AssistantThread messages={[prompt, answer]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Here it is.' }));
    expect(writeText).toHaveBeenCalledWith('Here it is.');
  });

  it('hides actions while streaming, and offers Retry on an error', async () => {
    const onRegenerate = jest.fn();
    const { rerender } = render(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'streaming' }]}
        onRegenerate={onRegenerate}
        onEdit={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /^Copy: Here/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit:/ })).not.toBeInTheDocument();

    rerender(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'error', error: 'Timed out' }]}
        onRegenerate={onRegenerate}
        labels={{ retry: 'Retry now' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Timed out');
    // Errors are announced by the alert, not the status region
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('edits a prompt in place and sends the new text', async () => {
    const onEdit = jest.fn();
    render(<AssistantThread messages={[prompt, answer]} onEdit={onEdit} labels={{ send: 'Save' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));
    const box = screen.getByRole('textbox', { name: 'Edit message' });
    expect(box).toHaveFocus();
    expect(box).toHaveValue('Write a debounce hook');

    await userEvent.clear(box);
    await userEvent.type(box, '{Enter}');
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(box, ' Write a throttle hook ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onEdit).toHaveBeenCalledWith(prompt, 'Write a throttle hook');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends an edit with Enter and cancels with Escape or the button', async () => {
    const onEdit = jest.fn();
    render(
      <AssistantThread messages={[prompt, answer]} onEdit={onEdit} labels={{ cancel: 'Never mind' }} />
    );
    const edit = () =>
      userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));

    await edit();
    await userEvent.type(screen.getByRole('textbox'), '{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await edit();
    await userEvent.click(screen.getByRole('button', { name: 'Never mind' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await edit();
    await userEvent.type(screen.getByRole('textbox'), '!{Enter}');
    expect(onEdit).toHaveBeenCalledWith(prompt, 'Write a debounce hook!');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest package/src/AssistantThread package/src/assistant`
Expected: FAIL, `Cannot find module './assistant-text'`, `Cannot find module './AssistantThread'` and `Cannot find module './assistant'`.

- [ ] **Step 4: Implement the helpers**

`package/src/AssistantThread/assistant-text.ts`:

```ts
import type { AssistantMessage } from '../types';

/** Text parts joined by a blank line: what Copy copies and what screen readers hear */
export function getAssistantText(message: Pick<AssistantMessage, 'parts'>): string {
  return message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n\n');
}

/** A tool's input or output for display: strings as they are, anything else as indented JSON */
export function formatJson(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
```

- [ ] **Step 5: Implement the component**

`package/src/AssistantThread/AssistantThread.tsx`:

```tsx
import {
  Alert,
  Badge,
  Box,
  BoxProps,
  Button,
  Code,
  Collapse,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  Group,
  Loader,
  StylesApiProps,
  Text,
  Textarea,
  UnstyledButton,
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import { useDisclosure, useId } from '@mantine/hooks';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronIcon, RegenerateIcon } from '../icons';
import { MarkdownBody } from '../MarkdownBody/MarkdownBody';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList } from '../MessageList/MessageList';
import type { AssistantMessage, AssistantPart } from '../types';
import { formatJson, getAssistantText } from './assistant-text';
import classes from './AssistantThread.module.css';

export type AssistantThreadStylesNames =
  | 'root'
  | 'list'
  | 'item'
  | 'turn'
  | 'bubble'
  | 'answer'
  | 'text'
  | 'thinking'
  | 'step'
  | 'stepHeader'
  | 'stepBody'
  | 'stepCode'
  | 'error'
  | 'actions'
  | 'editor';

export interface AssistantThreadLabels {
  copy: string;
  copied: string;

  /** Edit action on prompts */
  edit: string;

  /** Regenerate action on the last answer */
  regenerate: string;

  /** Button in the error alert */
  retry: string;

  /** Title of the error alert */
  error: string;

  /** Reasoning step while it streams, and the indicator before the first part arrives */
  thinking: string;

  /** Reasoning step once finished */
  thoughts: string;

  /** Tool states */
  running: string;
  done: string;
  failed: string;

  /** Captions above a tool's input and output */
  input: string;
  output: string;

  /** Accessible label of the box that edits a prompt */
  editPrompt: string;
  cancel: string;
  send: string;
}

export interface AssistantThreadProps
  extends BoxProps, StylesApiProps<AssistantThreadFactory>, ElementProps<'div'> {
  /** Prompts and answers, oldest first; update the last part of the last answer as tokens arrive */
  messages: AssistantMessage[];

  /** Keep the newest answer in view, following it as it streams, `true` by default */
  autoScroll?: boolean;

  /** Called to answer again; shows Regenerate on the last answer and Retry when it failed */
  onRegenerate?: (message: AssistantMessage) => void;

  /** Called with the new text when the user edits a prompt; shows Edit on prompts */
  onEdit?: (message: AssistantMessage, text: string) => void;

  /** Text, for translation */
  labels?: Partial<AssistantThreadLabels>;
}

export type AssistantThreadFactory = Factory<{
  props: AssistantThreadProps;
  ref: HTMLDivElement;
  stylesNames: AssistantThreadStylesNames;
}>;

type GetStyles = GetStylesApi<AssistantThreadFactory>;
type ToolPart = Extract<AssistantPart, { type: 'tool' }>;

const defaultLabels: AssistantThreadLabels = {
  copy: 'Copy',
  copied: 'Copied',
  edit: 'Edit',
  regenerate: 'Regenerate',
  retry: 'Retry',
  error: 'Something went wrong',
  thinking: 'Thinking…',
  thoughts: 'Thought process',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  input: 'Input',
  output: 'Output',
  editPrompt: 'Edit message',
  cancel: 'Cancel',
  send: 'Send',
};

const defaultProps: Partial<AssistantThreadProps> = { autoScroll: true };

const toolColors = { running: 'blue', done: 'teal', error: 'red' } as const;

// Parts of the inner MessageList that AssistantThread's Styles API also styles
const listParts = ['list', 'item'] as const;

/**
 * One text part. The markdown element is memoized on the text: when only a later part changes,
 * React reuses the element and skips MarkdownBody, so finished parts are never parsed again
 */
function TextPart({ text, streaming, getStyles }: { text: string; streaming: boolean; getStyles: GetStyles }) {
  const body = useMemo(() => <MarkdownBody>{text}</MarkdownBody>, [text]);

  return (
    <Box mod={{ streaming }} {...getStyles('text')}>
      {body}
    </Box>
  );
}

/** A reasoning or tool step: a header button that shows and hides the body */
function Step({
  label,
  badge,
  children,
  getStyles,
}: {
  label: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  getStyles: GetStyles;
}) {
  const [expanded, { toggle }] = useDisclosure(false);
  const id = useId();

  return (
    <Box {...getStyles('step')}>
      <UnstyledButton
        aria-expanded={expanded}
        aria-controls={id}
        onClick={toggle}
        mod={{ expanded }}
        {...getStyles('stepHeader')}
      >
        <ChevronIcon size={14} />
        {label}
        {badge}
      </UnstyledButton>
      <Collapse id={id} expanded={expanded} keepMounted={false}>
        <Box {...getStyles('stepBody')}>{children}</Box>
      </Collapse>
    </Box>
  );
}

/** Input and output of a tool; only rendered while its step is open */
function ToolDetails({
  part,
  labels,
  getStyles,
}: {
  part: ToolPart;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
}) {
  return (
    <>
      <Text size="xs" fw={500}>
        {labels.input}
      </Text>
      <Code block {...getStyles('stepCode')}>
        {formatJson(part.input)}
      </Code>
      {part.output !== undefined && (
        <>
          <Text size="xs" fw={500}>
            {labels.output}
          </Text>
          <Code block {...getStyles('stepCode')}>
            {formatJson(part.output)}
          </Code>
        </>
      )}
    </>
  );
}

/** A prompt being edited: Enter or Send submits the trimmed text, Escape or Cancel closes */
function PromptEditor({
  defaultValue,
  labels,
  onCancel,
  onSubmit,
  getStyles,
}: {
  defaultValue: string;
  labels: AssistantThreadLabels;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  getStyles: GetStyles;
}) {
  const [value, setValue] = useState(defaultValue);
  const text = value.trim();

  const submit = () => {
    if (text) {
      onSubmit(text);
    }
  };

  return (
    <Box {...getStyles('editor')}>
      <Textarea
        autosize
        autoFocus
        minRows={1}
        maxRows={10}
        aria-label={labels.editPrompt}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <Group justify="flex-end" gap="xs" mt="xs">
        <Button variant="default" size="xs" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button size="xs" disabled={!text} onClick={submit}>
          {labels.send}
        </Button>
      </Group>
    </Box>
  );
}

export const AssistantThread = factory<AssistantThreadFactory>((_props) => {
  const props = useProps('AssistantThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    messages,
    autoScroll,
    onRegenerate,
    onEdit,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<AssistantThreadFactory>({
    name: 'AssistantThread',
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
  const toolLabels = { running: allLabels.running, done: allLabels.done, error: allLabels.failed };
  const [editingId, setEditingId] = useState<string | null>(null);
  const last = messages[messages.length - 1];
  const busy = last?.status === 'streaming';

  // The log is aria-live="off", so tokens are not read out. When an answer finishes streaming its
  // text goes to the status region and is read once; errors are read by the Alert (role="alert")
  const [announcement, setAnnouncement] = useState('');
  const streamingId = useRef<string | null>(null);

  useEffect(() => {
    if (busy) {
      streamingId.current = last.id;
      return;
    }

    if (last && last.id === streamingId.current) {
      streamingId.current = null;

      if (last.status !== 'error') {
        setAnnouncement(getAssistantText(last));
      }
    }
  });

  const renderPart = (part: AssistantPart, index: number) => {
    if (part.type === 'text') {
      return (
        <TextPart
          key={index}
          text={part.text}
          streaming={part.state === 'streaming'}
          getStyles={getStyles}
        />
      );
    }

    if (part.type === 'reasoning') {
      return (
        <Step
          key={index}
          label={part.state === 'streaming' ? allLabels.thinking : allLabels.thoughts}
          getStyles={getStyles}
        >
          {part.text}
        </Step>
      );
    }

    return (
      <Step
        key={index}
        getStyles={getStyles}
        label={
          <Text component="span" inherit ff="monospace">
            {part.name}
          </Text>
        }
        badge={
          <Badge
            size="xs"
            variant="light"
            color={toolColors[part.state]}
            ml="auto"
            leftSection={part.state === 'running' ? <Loader size={8} color="blue" /> : null}
          >
            {toolLabels[part.state]}
          </Badge>
        }
      >
        <ToolDetails part={part} labels={allLabels} getStyles={getStyles} />
      </Step>
    );
  };

  const renderPrompt = (message: AssistantMessage) => {
    const text = getAssistantText(message);

    if (message.id === editingId) {
      return (
        <Box mod={{ role: 'user' }} {...getStyles('turn')}>
          <PromptEditor
            defaultValue={text}
            labels={allLabels}
            getStyles={getStyles}
            onCancel={() => setEditingId(null)}
            onSubmit={(next) => {
              setEditingId(null);
              onEdit!(message, next);
            }}
          />
        </Box>
      );
    }

    return (
      <Box mod={{ role: 'user' }} {...getStyles('turn')}>
        <Box {...getStyles('bubble')}>{text}</Box>
        <MessageActions
          actions={['copy', 'edit']}
          text={text}
          labels={{ copy: allLabels.copy, copied: allLabels.copied, edit: allLabels.edit }}
          onEdit={onEdit && !busy ? () => setEditingId(message.id) : undefined}
          {...getStyles('actions')}
        />
      </Box>
    );
  };

  const renderAnswer = (message: AssistantMessage) => {
    const streaming = message.status === 'streaming';
    const actions: MessageAction[] = ['copy'];

    if (onRegenerate && message.id === last.id) {
      actions.push({
        id: 'regenerate',
        label: allLabels.regenerate,
        icon: <RegenerateIcon />,
        onClick: () => onRegenerate(message),
      });
    }

    return (
      <Box mod={{ role: 'assistant', status: message.status }} {...getStyles('turn')}>
        <Box {...getStyles('answer')}>
          {message.parts.map(renderPart)}
          {streaming && message.parts.length === 0 && (
            <Loader type="dots" size="sm" aria-label={allLabels.thinking} {...getStyles('thinking')} />
          )}
        </Box>
        {message.status === 'error' && (
          <Alert color="red" variant="light" title={allLabels.error} {...getStyles('error')}>
            {message.error}
            {onRegenerate && (
              <Button
                display="block"
                mt="xs"
                size="xs"
                variant="light"
                color="red"
                onClick={() => onRegenerate(message)}
              >
                {allLabels.retry}
              </Button>
            )}
          </Alert>
        )}
        {!streaming && (
          <MessageActions
            actions={actions}
            text={getAssistantText(message)}
            labels={{ copy: allLabels.copy, copied: allLabels.copied }}
            {...getStyles('actions')}
          />
        )}
      </Box>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <>
      <MessageList<AssistantMessage>
        ref={ref}
        items={messages}
        isOwn={(message) => message.role === 'user'}
        withDateDividers={false}
        autoScroll={autoScroll}
        aria-live="off"
        unstyled={unstyled}
        classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
        styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
        {...getStyles('root')}
        {...others}
        renderItem={(message) =>
          message.role === 'user' ? renderPrompt(message) : renderAnswer(message)
        }
      />
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  );
});

AssistantThread.displayName = 'AssistantThread';
AssistantThread.classes = classes;
```

`package/src/AssistantThread/AssistantThread.module.css`:

```css
/* One prompt or answer, in a centred column like Claude and ChatGPT */
.turn {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 48rem;
  align-self: center;
  margin-top: var(--mantine-spacing-lg);

  &:where([data-role='user']) {
    align-items: flex-end;
  }
}

/* A prompt: a compact bubble on the right */
.bubble {
  max-width: 85%;
  padding: 8px 14px;
  border-radius: var(--mantine-radius-xl);
  font-size: var(--mantine-font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  @mixin light {
    background-color: var(--mantine-color-gray-1);
  }

  @mixin dark {
    background-color: var(--mantine-color-dark-5);
  }
}

/* An answer: parts in order, full width */
.answer {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-sm);
  min-width: 0;
  font-size: var(--mantine-font-size-sm);
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* The streaming cursor sits at the end of the last block of the text: MarkdownBody > last block */
.text {
  min-width: 0;

  &:where([data-streaming]) > * > :last-child::after {
    content: '';
    display: inline-block;
    width: 0.5em;
    height: 1em;
    margin-inline-start: 2px;
    vertical-align: text-bottom;
    background-color: currentColor;
    animation: blink 1s steps(1) infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

.thinking {
  align-self: flex-start;
  margin-block: 4px;
}

/* A reasoning or tool step */
.step {
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-md);
}

.stepHeader {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-xs);
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--mantine-radius-md);
  font-size: var(--mantine-font-size-sm);
  color: var(--mantine-color-dimmed);

  &:hover {
    background-color: var(--mantine-color-default-hover);
  }

  & > svg {
    flex-shrink: 0;
    transition: transform 150ms ease;
  }

  &[data-expanded] > svg {
    transform: rotate(90deg);
  }
}

.stepBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 10px 10px;
  font-size: var(--mantine-font-size-sm);
  color: var(--mantine-color-dimmed);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.stepCode {
  max-height: 240px;
  overflow: auto;
  white-space: pre;
}

.error {
  align-self: stretch;
}

/* Prompts show their actions on hover and focus, like ChatThread; answers always do */
.actions {
  :where(.turn[data-role='user']) > & {
    opacity: 0;
  }

  :where(.turn[data-role='user']:hover, .turn[data-role='user']:focus-within) > &,
  &[data-menu-open] {
    opacity: 1;
  }

  @media (hover: none) {
    opacity: 1;
  }
}

.editor {
  width: 100%;
}
```

`package/src/assistant.ts`:

```ts
export { AssistantThread } from './AssistantThread/AssistantThread';
export type {
  AssistantThreadProps,
  AssistantThreadFactory,
  AssistantThreadStylesNames,
  AssistantThreadLabels,
} from './AssistantThread/AssistantThread';
export { getAssistantText } from './AssistantThread/assistant-text';
export type { AssistantMessage, AssistantPart } from './types';
```

- [ ] **Step 6: Run tests**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100%. If the `renders a finished text part once` test counts 2 for `'Finished part'`, something above `TextPart` re-renders `MarkdownBody` through context: check that the test uses `setup` (state in a harness), not `rerender`, before touching the component.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add AssistantThread: streamed answers, steps, Stop-ready, regenerate and edit

Prompts are bubbles, answers full width; text parts render markdown and memoize
it per part; reasoning and tools are collapsible steps; errors show an alert with
Retry; finished answers are announced once through a status region.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Subpath builds, exports and the root peer check

**Files:**
- Create: `scripts/check-root-peers.ts`
- Modify: `rollup.config.mjs`, `scripts/generate-dts.ts`, `package/package.json`, `package.json`

**Interfaces:**
- Consumes: `package/src/markdown.ts` (Task 5), `package/src/assistant.ts` (Task 6), the optional peers in `package/package.json` (Task 5).
- Produces:
  - Build output: `dist/esm/{index,markdown,assistant}.mjs`, `dist/cjs/{index,markdown,assistant}.cjs`, `dist/types/{index,markdown,assistant}.d.ts` and `.d.mts`, one `dist/styles.css` (+ `styles.layer.css`) holding the CSS of all three entries.
  - `package/package.json` `exports` gains `./markdown` and `./assistant`.
  - `npm run check:peers` (`tsx scripts/check-root-peers [distDir]`): exit 1 when `esm/index.mjs` or `cjs/index.cjs` reaches any package other than the required peers, when an entry is missing, or when `esm/markdown.mjs` does not reach react-markdown (the check would be blind). Run by `npm test`.

- [ ] **Step 1: Write the check script**

`scripts/check-root-peers.ts`:

```ts
import fs from 'fs-extra';
import path from 'node:path';
import signale from 'signale';

/**
 * Fails when the root entry of the built package can reach a package other than its required
 * peers. Optional peers (react-markdown, remark-gfm) belong to the subpath entries only: an app
 * that never installs them must still build with `mantine-messages`, and bundlers fail on an
 * import() of a missing package too, so even lazy imports are caught.
 *
 *   tsx scripts/check-root-peers          checks package/dist
 *   tsx scripts/check-root-peers <dir>    checks another build, for example a fake one
 */
const dist = path.resolve(process.argv[2] ?? 'package/dist');
const packageJson = fs.readJsonSync(path.join(process.cwd(), 'package/package.json'));
const meta: Record<string, { optional?: boolean }> = packageJson.peerDependenciesMeta ?? {};
const optional = Object.keys(meta).filter((name) => meta[name].optional);
const required = Object.keys(packageJson.peerDependencies).filter(
  (name) => !optional.includes(name)
);

// `from 'x'`, `import 'x'`, `import('x')`, `require('x')`
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

const packageName = (specifier: string) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

/** Packages reachable from `entry` through its relative imports, with a file that imports each */
function reachablePackages(entry: string) {
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);
    const code = fs.readFileSync(file, 'utf-8');

    for (const [, specifier] of code.matchAll(SPECIFIER)) {
      if (specifier.startsWith('.')) {
        queue.push(path.resolve(path.dirname(file), specifier));
      } else {
        found.set(packageName(specifier), path.relative(dist, file));
      }
    }

    // An import() built from a template string has no plain specifier, but the name still shows
    for (const name of optional) {
      if (code.includes(name)) {
        found.set(name, path.relative(dist, file));
      }
    }
  }

  return found;
}

const errors: string[] = [];

for (const entry of ['esm/index.mjs', 'cjs/index.cjs']) {
  const file = path.join(dist, entry);

  if (!fs.existsSync(file)) {
    errors.push(`${entry} is missing: run npm run build first`);
    continue;
  }

  for (const [name, importer] of reachablePackages(file)) {
    if (!required.includes(name)) {
      errors.push(`${entry} reaches ${name} (imported by ${importer})`);
    }
  }
}

// The check must see an optional peer where it belongs, or it proves nothing
const markdownEntry = path.join(dist, 'esm/markdown.mjs');

if (!fs.existsSync(markdownEntry)) {
  errors.push('esm/markdown.mjs is missing: run npm run build first');
} else if (!reachablePackages(markdownEntry).has('react-markdown')) {
  errors.push('esm/markdown.mjs does not reach react-markdown: the check cannot see imports');
}

if (errors.length > 0) {
  errors.forEach((error) => signale.error(error));
  signale.error(`The root entry may only import ${required.join(', ')}`);
  process.exit(1);
}

signale.success(`The root entry imports only ${required.join(', ')}`);
```

- [ ] **Step 2: Run it against a fake build that breaks the rule, to see it fail**

```bash
FAKE=$(mktemp -d)
mkdir -p "$FAKE/esm/a" "$FAKE/cjs"
printf "export { X } from './a/x.mjs';\n" > "$FAKE/esm/index.mjs"
printf "import Markdown from 'react-markdown';\nexport const X = Markdown;\n" > "$FAKE/esm/a/x.mjs"
printf "const gfm = require('remark-gfm');\n" > "$FAKE/cjs/index.cjs"
printf "import 'react-markdown';\n" > "$FAKE/esm/markdown.mjs"
npx tsx scripts/check-root-peers "$FAKE"; echo "exit $?"
```

Expected:

```
✖  error     esm/index.mjs reaches react-markdown (imported by esm/a/x.mjs)
✖  error     cjs/index.cjs reaches remark-gfm (imported by cjs/index.cjs)
✖  error     The root entry may only import @mantine/core, @mantine/hooks, react, react-dom
exit 1
```

Then `printf "export {};\n" > "$FAKE/esm/markdown.mjs"` and run again: the output also contains `esm/markdown.mjs does not reach react-markdown`. Delete the fake: `rm -rf "$FAKE"`.

- [ ] **Step 3: Build three entries**

In `rollup.config.mjs`, after `const outputDir = ...` add:

```js
// The root entry and the subpath entries; optional peers are imported only below their subpath
const entries = ['index', 'markdown', 'assistant'];
```

replace `input: path.join(process.cwd(), './package/src/index.ts'),` with:

```js
  input: entries.map((entry) => path.join(process.cwd(), `./package/src/${entry}.ts`)),
```

and in the `postcss({ ... })` options replace `extract: true,` with:

```js
      // One CSS file for every entry (no CSS imports an optional peer). A fixed name, because
      // `true` names it after whichever entry chunk comes first
      extract: 'index.css',
```

In `scripts/generate-dts.ts` replace the `await fs.copy(...)` call with:

```ts
    for (const entry of ['index', 'markdown', 'assistant']) {
      await fs.copy(
        path.join(process.cwd(), `package/dist/types/${entry}.d.ts`),
        path.join(process.cwd(), `package/dist/types/${entry}.d.mts`)
      );
    }
```

In `package/package.json` replace the `exports` block with:

```json
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.mts",
        "default": "./dist/esm/index.mjs"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.cjs"
      }
    },
    "./markdown": {
      "import": {
        "types": "./dist/types/markdown.d.mts",
        "default": "./dist/esm/markdown.mjs"
      },
      "require": {
        "types": "./dist/types/markdown.d.ts",
        "default": "./dist/cjs/markdown.cjs"
      }
    },
    "./assistant": {
      "import": {
        "types": "./dist/types/assistant.d.mts",
        "default": "./dist/esm/assistant.mjs"
      },
      "require": {
        "types": "./dist/types/assistant.d.ts",
        "default": "./dist/cjs/assistant.cjs"
      }
    },
    "./styles.css": "./dist/styles.css",
    "./styles.layer.css": "./dist/styles.layer.css"
  },
```

In the root `package.json` scripts add `"check:peers": "tsx scripts/check-root-peers",` after `"build"`, and change `test` to:

```json
    "test": "npm run syncpack && npm run format:test && npm run check:peers && npm run typecheck && npm run lint && npm run coverage",
```

- [ ] **Step 4: Build and check**

Run:

```bash
npm run clean && npm run build
ls package/dist/esm/markdown.mjs package/dist/esm/assistant.mjs package/dist/cjs/markdown.cjs package/dist/cjs/assistant.cjs package/dist/types/markdown.d.mts package/dist/types/assistant.d.mts package/dist/styles.css
grep -c "@keyframes" package/dist/styles.css
grep -l "react-markdown" package/dist/esm/MarkdownBody/MarkdownBody.mjs
npm run check:peers
(cd docs && node -e "console.log(require.resolve('mantine-messages/markdown'), require.resolve('mantine-messages/assistant'))")
```

Expected: every `ls` path exists; `@keyframes` count is at least 1 (the assistant cursor's CSS is in the shared file); `MarkdownBody.mjs` is listed (react-markdown stays an external import, not bundled); `✔  success   The root entry imports only @mantine/core, @mantine/hooks, react, react-dom`; node prints `.../package/dist/cjs/markdown.cjs .../package/dist/cjs/assistant.cjs`.

- [ ] **Step 5: Run the suite**

Run: `npx oxfmt -c oxfmt.config.mjs --write scripts && npm run docgen && npm test`
Expected: exit 0, 100%; the test chain prints the check:peers success line.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Build mantine-messages/markdown and /assistant, and check the root bundle's peers

Rollup builds three entries into one styles.css. check:peers walks the import
graph of the built root entry (ESM and CJS) and fails on anything but the required
peers; npm test runs it against package/dist.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Stories

**Files:**
- Create: `package/src/Assistant.story.tsx`
- Modify: `package/src/Messages.story.tsx`

**Interfaces:**
- Consumes: `AssistantThread`, `getAssistantText` (Task 6), `Composer` `streaming`/`onStop` (Task 3), `ChatThread.renderBody` (Task 4), `MarkdownBody` (Task 5).
- Produces: Storybook stories `Assistant / Assistant`, `Assistant / States`, `Messages / Markdown In Chat`. No package API.

- [ ] **Step 1: The assistant stories**

`package/src/Assistant.story.tsx`:

```tsx
import { Badge, Box, Group, Paper, Switch, Text } from '@mantine/core';
import React, { useEffect, useRef, useState } from 'react';
import { getAssistantText } from './AssistantThread/assistant-text';
import { AssistantThread } from './AssistantThread/AssistantThread';
import { Composer, type ComposerDraft } from './Composer/Composer';
import type { AssistantMessage, AssistantPart } from './types';

export default { title: 'Assistant' };

const ANSWER = [
  'Debounce the **value**, not the handler. This hook waits until the value stops changing:',
  '',
  '```tsx',
  "import { useEffect, useState } from 'react';",
  '',
  'export function useDebouncedValue<T>(value: T, wait = 300) {',
  '  const [debounced, setDebounced] = useState(value);',
  '',
  '  useEffect(() => {',
  '    const timer = window.setTimeout(() => setDebounced(value), wait);',
  '    return () => window.clearTimeout(timer);',
  '  }, [value, wait]);',
  '',
  '  return debounced;',
  '}',
  '```',
  '',
  'A few things to know:',
  '',
  '- The timer restarts on every change, so only the **last** value comes through',
  '- `wait` is in milliseconds; 300 suits a search box',
  '- Mantine already ships one: [use-debounced-value](https://mantine.dev/hooks/use-debounced-value/)',
  '',
  '| Wait | Feels like |',
  '| --- | --- |',
  '| 150 ms | instant |',
  '| 300 ms | calm |',
].join('\n');

const RESULTS = {
  results: [
    { title: 'use-debounced-value', url: 'https://mantine.dev/hooks/use-debounced-value/' },
  ],
};

/** One change the fake model makes per tick */
type Step = (message: AssistantMessage) => AssistantMessage;

function updateLast(
  message: AssistantMessage,
  update: (part: AssistantPart) => AssistantPart
): AssistantMessage {
  const parts = [...message.parts];
  parts[parts.length - 1] = update(parts[parts.length - 1]);
  return { ...message, parts };
}

const pause: Step = (message) => message;

const add =
  (part: AssistantPart): Step =>
  (message) => ({ ...message, parts: [...message.parts, part] });

const append =
  (text: string): Step =>
  (message) =>
    updateLast(message, (part) => (part.type === 'tool' ? part : { ...part, text: `${part.text}${text}` }));

const settle = (part: AssistantPart): AssistantPart =>
  part.type === 'tool' ? part : { ...part, state: 'done' };

/** Where Stop leaves a part: text and reasoning done, a running tool failed */
const stopPart = (part: AssistantPart): AssistantPart => {
  if (part.type !== 'tool') {
    return { ...part, state: 'done' };
  }

  return part.state === 'running' ? { ...part, state: 'error', output: 'Stopped' } : part;
};

/** Words with the space before them, so joining them gives the text back */
const tokens = (text: string) => text.match(/\s*\S+/g) ?? [];

/** Everything the fake model does for one prompt: think, search, then write */
function script(prompt: string, fail: boolean): Step[] {
  const reasoning = `They asked: "${prompt}". A hook that delays a changing value fits. Check the Mantine docs for an existing one, then show the code and the gotchas.`;

  return [
    ...Array<Step>(15).fill(pause),
    add({ type: 'reasoning', text: '', state: 'streaming' }),
    ...tokens(reasoning).map(append),
    (message) => updateLast(message, settle),
    add({
      type: 'tool',
      name: 'search_docs',
      input: { query: 'debounce hook', site: 'mantine.dev' },
      state: 'running',
    }),
    ...Array<Step>(30).fill(pause),
    (message) =>
      updateLast(message, (part) =>
        part.type === 'tool' ? { ...part, state: 'done', output: RESULTS } : part
      ),
    add({ type: 'text', text: '', state: 'streaming' }),
    ...tokens(fail ? ANSWER.slice(0, 180) : ANSWER).map(append),
    fail
      ? (message) => ({
          ...updateLast(message, settle),
          status: 'error',
          error: 'The model is overloaded. Try again in a moment.',
        })
      : (message) => ({ ...updateLast(message, settle), status: 'done' }),
  ];
}

const answerShell = (id: string): AssistantMessage => ({
  id,
  authorId: 'assistant',
  role: 'assistant',
  createdAt: new Date(),
  status: 'streaming',
  parts: [],
});

const prompt = (id: string, text: string): AssistantMessage => ({
  id,
  authorId: 'me',
  role: 'user',
  createdAt: new Date(),
  parts: [{ type: 'text', text }],
});

const FIRST = 'How do I debounce a search box in React?';

const initialMessages: AssistantMessage[] = [
  prompt('prompt-0', FIRST),
  script(FIRST, false).reduce((message, step) => step(message), answerShell('answer-0')),
];

/** A fake model: streams a canned answer, one step every 30 ms, with Stop, regenerate and edit */
function useFakeAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [fail, setFail] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const count = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

  /** Answers the last prompt of `history` */
  const run = (history: AssistantMessage[]) => {
    clearInterval(timer.current);
    count.current += 1;
    const steps = script(getAssistantText(history[history.length - 1]), fail);
    let message = answerShell(`answer-${count.current}`);
    let index = 0;
    setMessages([...history, message]);

    timer.current = setInterval(() => {
      message = steps[index](message);
      index += 1;

      if (index === steps.length) {
        clearInterval(timer.current);
      }

      setMessages([...history, message]);
    }, 30);
  };

  const stop = () => {
    clearInterval(timer.current);
    setMessages((current) =>
      current.map((message) =>
        message.status === 'streaming'
          ? { ...message, status: 'done', parts: message.parts.map(stopPart) }
          : message
      )
    );
  };

  const send = ({ text }: ComposerDraft) => {
    count.current += 1;
    run([...messages, prompt(`prompt-${count.current}`, text)]);
  };

  const regenerate = (message: AssistantMessage) =>
    run(messages.slice(0, messages.indexOf(message)));

  const edit = (message: AssistantMessage, text: string) =>
    run([
      ...messages.slice(0, messages.indexOf(message)),
      { ...message, parts: [{ type: 'text', text }] },
    ]);

  const streaming = messages[messages.length - 1]?.status === 'streaming';
  return { messages, streaming, fail, setFail, send, stop, regenerate, edit };
}

/** Ask anything: the answer streams in token by token, with a reasoning step and a tool call */
export function Assistant() {
  const { messages, streaming, fail, setFail, send, stop, regenerate, edit } = useFakeAssistant();

  return (
    <Box p="xl">
      <Paper
        withBorder
        radius="lg"
        h={720}
        maw={900}
        mx="auto"
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Group
          justify="space-between"
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group gap="xs">
            <Text fw={600}>Assistant</Text>
            <Badge variant="light" size="sm">
              Fake stream
            </Badge>
          </Group>
          <Switch
            size="xs"
            label="Fail the next answer"
            checked={fail}
            onChange={(event) => setFail(event.currentTarget.checked)}
          />
        </Group>
        <AssistantThread
          messages={messages}
          onRegenerate={regenerate}
          onEdit={edit}
          style={{ flex: 1 }}
        />
        <Box px="md" pb="md" pt="xs" w="100%" maw={800} mx="auto">
          <Composer
            placeholder="Ask anything"
            format="markdown"
            streaming={streaming}
            onStop={stop}
            onSend={send}
          />
          <Text size="xs" c="dimmed" ta="center" mt={6}>
            Answers come from a canned script, streamed every 30 ms.
          </Text>
        </Box>
      </Paper>
    </Box>
  );
}

/** Still frames: a failed answer, then one mid-stream with a running tool and a cursor */
export function States() {
  const messages: AssistantMessage[] = [
    prompt('s1', 'Summarise the release notes'),
    {
      ...answerShell('s2'),
      status: 'error',
      error: 'The model is overloaded. Try again in a moment.',
      parts: [{ type: 'text', text: 'The release adds', state: 'done' }],
    },
    prompt('s3', 'Check the build for me'),
    {
      ...answerShell('s4'),
      parts: [
        { type: 'reasoning', text: 'Run the tests first.', state: 'done' },
        { type: 'tool', name: 'run_tests', input: { filter: 'Composer' }, state: 'running' },
        { type: 'text', text: 'Running the Composer tests now, then', state: 'streaming' },
      ],
    },
  ];

  return (
    <Box p="xl" maw={900} mx="auto">
      <Paper withBorder radius="lg" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <AssistantThread messages={messages} onRegenerate={() => {}} style={{ flex: 1 }} />
        <Composer m="md" streaming onStop={() => {}} />
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 2: Markdown in chat**

In `package/src/Messages.story.tsx` add `import { MarkdownBody } from './MarkdownBody/MarkdownBody';` after the `Inbox` import, and append:

```tsx
const now = Date.now();

const markdownMessages: ChatMessage[] = [
  {
    id: 'md1',
    authorId: 'maya',
    format: 'markdown',
    createdAt: new Date(now - 6 * 60 * 1000),
    body: 'Agenda for **Saturday**:\n\n1. Venue walk-through at 10\n2. Menu tasting, see [the menu](https://example.com/menu)\n3. Seating plan',
  },
  {
    id: 'md2',
    authorId: 'me',
    format: 'markdown',
    createdAt: new Date(now - 4 * 60 * 1000),
    status: 'read',
    body: 'Looks good. Tables for the plan, from `seat.ts`:\n\n```ts\nconst tables = Math.ceil(guests.length / 8);\n```',
  },
  {
    id: 'md3',
    authorId: 'maya',
    createdAt: new Date(now - 2 * 60 * 1000),
    body: 'Plain text messages keep their *asterisks*.',
  },
];

/** Markdown messages through renderBody and MarkdownBody; plain ones stay plain */
export function MarkdownInChat() {
  return (
    <Box p="xl" maw={520}>
      <Paper withBorder radius="lg" h={520} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={markdownMessages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          renderBody={(message) =>
            message.format === 'markdown' ? <MarkdownBody>{message.body}</MarkdownBody> : message.body
          }
        />
      </Paper>
    </Box>
  );
}
```

- [ ] **Step 3: Check**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src && npx tsc --noEmit && npm run lint && npm run coverage`
Expected: all pass, 100% (stories are not covered). Start Storybook if it is not running (`npm run storybook`, port 8281) and open `http://localhost:8281/?path=/story/assistant--assistant`: send "What about throttling?" and watch dots, a "Thinking…" step, a Running tool turning Done, then text streaming with a blinking cursor while the list follows it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add assistant stories driven by a fake token stream, and markdown in chat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Docs, the gate and the browser check

**Files:**
- Create: `docs/demos/Assistant.demo.tsx`
- Modify: `docs/demos/index.ts`, `docs/docs.mdx`, `docs/pages/index.tsx`, `docs/styles-api/index.ts`, `scripts/docgen.ts`, `CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: everything above, through the built subpaths `mantine-messages/markdown` and `mantine-messages/assistant`.
- Produces: no code API.

- [ ] **Step 1: Docgen and the docs page**

In `scripts/docgen.ts` add to `componentsPaths`: `getComponentPath('MarkdownBody/MarkdownBody.tsx')`, `getComponentPath('AssistantThread/AssistantThread.tsx')`.

In `docs/pages/index.tsx` add `'MarkdownBody', 'AssistantThread'` to the end of both `componentsProps` and `componentsStyles`.

- [ ] **Step 2: Styles API data**

In `docs/styles-api/index.ts` add after the `mantine-messages` import:

```ts
import type { AssistantThreadFactory } from 'mantine-messages/assistant';
import type { MarkdownBodyFactory } from 'mantine-messages/markdown';
```

Add `modifiers` to `ComposerStylesApi`:

```ts
  modifiers: [
    {
      modifier: 'data-streaming',
      selector: 'send',
      condition: '`streaming` is set: the button stops the answer',
    },
  ],
```

Add before `STYLES_API_DATA`:

```ts
export const MarkdownBodyStylesApi: StylesApiData<MarkdownBodyFactory> = {
  selectors: {
    root: 'Root element, a Mantine Typography',
    link: 'Link; opens in a new tab',
    code: 'Inline code',
    codeBlock: 'Fenced code block: header and code',
    codeHeader: 'Language and copy button above a code block',
    copy: 'Copy button of a code block',
    pre: 'Code of a code block',
  },
  vars: {},
};

export const AssistantThreadStylesApi: StylesApiData<AssistantThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of prompts and answers, a log that does not read tokens aloud',
    item: 'Wrapper of one prompt or answer',
    turn: 'One prompt or answer, in a centred column',
    bubble: 'Text of a prompt',
    answer: 'Parts of an answer, in order',
    text: 'One text part, rendered with MarkdownBody',
    thinking: 'Dots shown before the first part of an answer arrives',
    step: 'Reasoning or tool step',
    stepHeader: 'Button that opens a step: name and state',
    stepBody: 'Reasoning text, or a tool’s input and output',
    stepCode: 'Input or output of a tool, as JSON',
    error: 'Alert under a failed answer, with Retry',
    actions: 'Copy, Regenerate and Edit',
    editor: 'Text box and buttons while a prompt is edited',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-role', selector: 'turn', condition: '`user` for prompts, `assistant` for answers' },
    {
      modifier: 'data-status',
      selector: 'turn',
      condition: 'The answer has a `status`: streaming, done or error',
    },
    { modifier: 'data-streaming', selector: 'text', condition: 'The part is streaming: a cursor blinks at its end' },
    { modifier: 'data-expanded', selector: 'stepHeader', condition: 'The step is open' },
  ],
};
```

and add `MarkdownBody: MarkdownBodyStylesApi,` and `AssistantThread: AssistantThreadStylesApi,` to `STYLES_API_DATA`.

- [ ] **Step 3: The assistant demo**

`docs/demos/Assistant.demo.tsx`:

```tsx
import { Paper } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { AssistantMessage, AssistantPart, Composer, ComposerDraft } from 'mantine-messages';
import { AssistantThread } from 'mantine-messages/assistant';
import React, { useEffect, useRef, useState } from 'react';

const reply = `Debounce the **value**, not the handler:

\`\`\`tsx
const [search, setSearch] = useState('');
const [debounced] = useDebouncedValue(search, 300);
\`\`\`

Then fetch when \`debounced\` changes. Mantine ships [useDebouncedValue](https://mantine.dev/hooks/use-debounced-value/).`;

const code = `
import { useRef, useState } from 'react';
import { Paper } from '@mantine/core';
import { Composer, type AssistantMessage } from 'mantine-messages';
import { AssistantThread } from 'mantine-messages/assistant';

function Demo() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const streaming = messages.at(-1)?.status === 'streaming';

  // Your model client: append each token to the last text part of the last answer,
  // then set status to 'done' (or 'error' with an error text)
  const ask = (history: AssistantMessage[]) => streamAnswer(history, setMessages);

  return (
    <Paper withBorder radius="lg" h={520} style={{ display: 'flex', flexDirection: 'column' }}>
      <AssistantThread
        messages={messages}
        onRegenerate={(message) => ask(messages.slice(0, messages.indexOf(message)))}
        onEdit={(message, text) =>
          ask([
            ...messages.slice(0, messages.indexOf(message)),
            { ...message, parts: [{ type: 'text', text }] },
          ])
        }
        style={{ flex: 1 }}
      />
      <Composer
        m="sm"
        placeholder="Ask anything"
        streaming={streaming}
        onStop={stopAnswer}
        onSend={({ text }) =>
          ask([
            ...messages,
            { id: crypto.randomUUID(), authorId: 'me', role: 'user', createdAt: new Date(), parts: [{ type: 'text', text }] },
          ])
        }
      />
    </Paper>
  );
}
`;

const finishPart = (part: AssistantPart): AssistantPart =>
  part.type === 'tool' ? part : { ...part, state: 'done' };

function Demo() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const count = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

  // A fake model: streams the same reply, a word every 40 ms
  const ask = (history: AssistantMessage[]) => {
    clearInterval(timer.current);
    count.current += 1;
    const id = `answer-${count.current}`;
    const words = reply.match(/\s*\S+/g) ?? [];
    let shown = 0;

    const answer = (status: AssistantMessage['status']): AssistantMessage => ({
      id,
      authorId: 'assistant',
      role: 'assistant',
      createdAt: new Date(),
      status,
      parts: [
        {
          type: 'text',
          text: words.slice(0, shown).join(''),
          state: status === 'streaming' ? 'streaming' : 'done',
        },
      ],
    });

    setMessages([...history, answer('streaming')]);
    timer.current = setInterval(() => {
      shown += 1;
      const done = shown >= words.length;

      if (done) {
        clearInterval(timer.current);
      }

      setMessages([...history, answer(done ? 'done' : 'streaming')]);
    }, 40);
  };

  const stop = () => {
    clearInterval(timer.current);
    setMessages((current) =>
      current.map((message) =>
        message.status === 'streaming'
          ? { ...message, status: 'done', parts: message.parts.map(finishPart) }
          : message
      )
    );
  };

  const send = ({ text }: ComposerDraft) => {
    count.current += 1;
    ask([
      ...messages,
      {
        id: `prompt-${count.current}`,
        authorId: 'me',
        role: 'user',
        createdAt: new Date(),
        parts: [{ type: 'text', text }],
      },
    ]);
  };

  return (
    <Paper
      withBorder
      radius="lg"
      h={520}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <AssistantThread
        messages={messages}
        onRegenerate={(message) => ask(messages.slice(0, messages.indexOf(message)))}
        onEdit={(message, text) =>
          ask([
            ...messages.slice(0, messages.indexOf(message)),
            { ...message, parts: [{ type: 'text', text }] },
          ])
        }
        style={{ flex: 1 }}
      />
      <Composer
        m="sm"
        placeholder="Ask how to debounce a search box"
        streaming={messages[messages.length - 1]?.status === 'streaming'}
        onStop={stop}
        onSend={send}
      />
    </Paper>
  );
}

export const assistant: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};
```

In `docs/demos/index.ts` add `export { assistant } from './Assistant.demo';`.

- [ ] **Step 4: docs.mdx**

In `docs/docs.mdx`, in "## Installation", after the styles code block add:

```mdx
Markdown and the assistant live in their own entries, `mantine-messages/markdown` and
`mantine-messages/assistant`, with two optional peers. Install them only if you use those entries;
`mantine-messages` itself never imports them:

<InstallScript packages="react-markdown remark-gfm" />

The one `styles.css` covers every entry.
```

Before "## Inbox" add:

````mdx
## Markdown

`MarkdownBody` from `mantine-messages/markdown` renders GitHub flavoured markdown (tables, task
lists, strikethrough) with Mantine `Typography` styles. It is safe by default: raw HTML shows as
text and never becomes elements, `javascript:` links are dropped, links open in a new tab with
`rel="noreferrer"`, and code blocks show their language and a copy button.

`ChatThread` shows `body` as plain text. Render markdown messages with `renderBody`:

```tsx
import { ChatThread } from 'mantine-messages';
import { MarkdownBody } from 'mantine-messages/markdown';

<ChatThread
  messages={messages}
  users={users}
  currentUserId="me"
  renderBody={(message) =>
    message.format === 'markdown' ? <MarkdownBody>{message.body}</MarkdownBody> : message.body
  }
/>
```

Replace a built-in renderer with `components`, for example code blocks highlighted by
`@mantine/code-highlight`: `<MarkdownBody components={{ pre: HighlightedPre }}>`. Add remark
plugins with `remarkPlugins`; they run after remark-gfm.

## Assistant

`AssistantThread` from `mantine-messages/assistant` is a chat with a model: prompts are compact
bubbles on the right, answers are full width. It renders text with `MarkdownBody`, so it needs the
same two peers.

Each `AssistantMessage` has a `role` (`'user'` or `'assistant'`) and `parts`, rendered in order:
`text` (markdown), `reasoning` and `tool`. Reasoning and tools are collapsible steps; a tool shows
its state (running, done, failed) and, when opened, its input and output as JSON.

To stream, set the answer's `status` to `'streaming'` and update its last part as tokens arrive.
Finished parts are memoized, so only the streaming part renders again, and a cursor blinks at its
end. The list follows the answer as it grows while the user is at the bottom. Finish with
`'done'`, or `'error'` with an `error` text to show an alert with Retry.

```tsx
setMessages((current) => {
  const answer = current[current.length - 1];
  const parts = [...answer.parts];
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = { ...last, text: `${last.text}${token}` };
  return [...current.slice(0, -1), { ...answer, parts }];
});
```

- Stop: pass `streaming` and `onStop` to `Composer`; its send button becomes a stop button
- Regenerate: `onRegenerate(message)` shows Regenerate on the last answer and Retry on an error
- Edit and resend: `onEdit(message, text)` lets the user edit a prompt in place; drop the answers
  after it and ask again

Screen readers: the list is a `role="log"` with `aria-live="off"`, so tokens are not read out.
When an answer finishes, its text goes to a visually hidden status region and is read once.
Errors are read by their alert.

<Demo data={demos.assistant} />
````

- [ ] **Step 5: CHANGELOG and README**

In `CHANGELOG.md`, under `## Unreleased` / `### Added`, append:

```markdown
- `mantine-messages/markdown`: `MarkdownBody`, safe markdown with code blocks and copy buttons;
  react-markdown and remark-gfm are optional peers, never imported by the root entry
- `mantine-messages/assistant`: `AssistantThread` for LLM chat: streamed answers with markdown,
  collapsible reasoning and tool steps, regenerate, edit and resend, and finished answers
  announced to screen readers; `getAssistantText`
- `ChatThread`: `renderBody`, for example to render markdown messages with `MarkdownBody`
- `Composer`: `streaming` and `onStop` turn the send button into a stop button
- `MessageList`: follows the newest item while it grows, for streamed answers
- Types: `AssistantMessage`, `AssistantPart`
- A build check that the root entry reaches no optional peer (`npm run check:peers`, part of `npm test`)
```

In `README.md` add rows to the Components table:

```markdown
| `MarkdownBody` | From `mantine-messages/markdown`: safe markdown with Mantine typography, code blocks and copy buttons |
| `AssistantThread` | From `mantine-messages/assistant`: LLM chat with streamed answers, reasoning and tool steps, Stop, Regenerate, edit and resend |
```

and after the table:

```markdown
Markdown and the assistant need two optional peers: `yarn add react-markdown remark-gfm`. The root
entry never imports them.
```

- [ ] **Step 6: Gate**

Run: `npx oxfmt -c oxfmt.config.mjs --write package/src docs test-utils scripts && npm run build && npm run docgen && npm test && npm run docs:build`
Expected: exit 0, 100%; `docs/docgen.json` has `MarkdownBody` and `AssistantThread` keys; the Next build finishes (it imports `mantine-messages/assistant`, which imports react-markdown). If docgen skipped a component, remove it from `componentsProps` only and say so in the commit message.

- [ ] **Step 7: Browser check (Steve watches)**

Storybook on port 8281 (`npm run storybook` if it is not running).

`http://localhost:8281/?path=/story/assistant--assistant`:
- The first exchange is there: a grey prompt bubble on the right; under it, collapsed "Thought process" and `search_docs` (Done) steps, then the answer with a bold word, a `tsx` code block with a copy button, a list with inline code and a link, and a table. Copy and Regenerate show under the answer.
- Opening `search_docs` shows Input and Output JSON; the chevron turns.
- Send "What about throttling?": the bubble appears and the view scrolls to it; dots, then a "Thinking…" step, then `search_docs` with a spinning Running badge that turns Done, then text streaming with a blinking cursor. The view follows the growing answer; scroll up mid-stream and it stops following; scroll back down and it follows again.
- While streaming the Composer button is a square Stop; Enter does not send. Stop ends the answer where it is; the button turns back into Send.
- Regenerate replaces the last answer with a new stream. Hover the first prompt, click Edit, change the text, Enter: the answers after it are replaced by a new one.
- Turn on "Fail the next answer" and send: the answer stops early and a red alert with Retry shows; Retry streams again.
- In devtools, the element with `role="log"` has `aria-live="off"`, and after an answer finishes the `role="status"` element holds its text.

`?path=/story/assistant--states` and `?path=/story/assistant--assistant&globals=theme:dark`: steps, badges, code blocks, the alert and the prompt bubble read well in both themes; the cursor blinks on the mid-stream answer.

`?path=/story/messages--markdown-in-chat`: Maya's agenda shows a numbered list and a link; your message shows inline code and a code block on the blue bubble, with the link and code readable; the plain message keeps its asterisks.

Docs (`npm run dev`, `http://localhost:9291`): the Markdown and Assistant sections render, the assistant demo streams, Stop works, and the Props and Styles API tabs list `MarkdownBody` and `AssistantThread`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Document markdown and the assistant: install, renderBody, streaming, Stop and a demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After this phase

Merge `feat/assistant` the same way as phase 1 (full suite on the result, after phase 2 if it landed first), push, and open a PR so CI runs (CI builds before `npm test`, so `check:peers` sees a fresh bundle). Then release 0.1 per the spec.

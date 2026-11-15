# Restructure + theming plan: mantine-messages to official-extension parity

Inputs: `official-parity.md`, `api-shape.md` (same folder). Base: main @ 4799bf9. Package is
unpublished (0.0.0), so breaking renames ship without aliases, in one release.

## Decided (Steve, 2026-11-15)

D1 `handlersRef` (Mantine precedent: NumberInput). D2 frame + `ThreadPanel.Replies`. D3 parts NOW (B3 in this
pass, not a later release). D4 markdown adapter, one entry. D5 (a) `leftSection`/`rightSection` (Mantine input
pattern). D6 core `Toolbar` if it fits (A4 prototype). D7 stories beside components NOW (C2). B1 includes the
"consider" renames (Inbox `searchValue`/`defaultSearchValue` like Combobox). Rule from Steve: follow the existing
Mantine pattern without asking; releasable, no deferrals or bandaids. Comments are already Mantine style (standards
lane). C1 also adds a repo CLAUDE.md recording the standards (like mantine-doc-viewer's).

## Decisions as proposed by the review (state, options, recommendation)

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Store for imperative control | (a) global store like Spotlight/Lightbox (`messages.jumpTo()`); (b) per-instance store like `useCombobox()`/`useTree()` shared by thread + Composer; (c) keep a ref, renamed | **(c)**: rename `controlRef` to `handlersRef`. Two lists are on screen together (TeamThread + ThreadPanel), so (a) is ambiguous. (b) duplicates controlled props for 3 lines of app glue. Revisit (b) only if a ready-made "messages app" wrapper is built |
| D2 | ThreadPanel's 14 pass-through props | (a) `threadProps?: Partial<TeamThreadProps>` passthrough; (b) frame + `ThreadPanel.Replies` static (Lightbox/Drawer style); (c) keep | **(b)**. It removes the drilling for good and gives the title/close/focus frame its own small API. (a) is the 1-hour fallback if (b) slips |
| D3 | Custom message rows | (a) keep `renderBody` only (add it to TeamThread); (b) `renderMessage` + part statics on ChatThread/TeamThread sharing the thread's Styles API | **(a) now, (b) in R3**. `renderBody` stays as the shorthand for the common case |
| D4 | Markdown dependency | (a) keep `./markdown`/`./assistant` subpaths + optional peers; (b) adapter like code-highlight, one entry, no peers | **(b)**. MarkdownBody's own value (block splitting, Mantine renderers, labels, Styles API) does not depend on the engine |
| D5 | Composer attachments | (a) drop `draft.attachments`, add `leftSection`/`rightSection`; (b) full attachments value triad + pill row; (c) Composer.Root + parts | **(a)**; (b) when attachments become a feature; (c) only if sections prove too little |
| D6 | MessageActions on core `Toolbar` | adopt / keep hand-rolled | Prototype in A4; adopt only if the overflow Menu and the one-tab-stop behaviour survive (unverified fit) |
| D7 | Stories beside components | move now / later | Later (C2): e2e story ids change |

## Order and lanes

Lanes in one phase touch disjoint files and run in parallel. The lead merges them one at a time
and runs the full `npm test` in the background after each merge, plus `npm run e2e` after any
visual lane. Each lane runs only its fast checks.
Brief line for every lane: "at 400k tokens, finish what is in hand, commit, report what is left".

```
Phase A (theming)   A0 ChatThread (pattern, Opus) -> then A1..A6 in parallel (Sonnet)
Phase B (API)       B1 renames (alone, Sonnet, codemod commit first) -> then B2, B3, B4 in parallel
Phase C (surface)   C1 index/types/docs data (alone) -> C2 docs demos + stories (parallel by section)
```

### Phase A: theming contract (api-5 table; styles-api-5/-7/-8/-9)

The common recipe, set by A0 and copied by A1-A6:
1. Add the props to `XProps` with JSDoc, and their defaults to `defaultProps` (typed `satisfies Partial<XProps>`).
2. `XCssVariables` type; `vars: XCssVariables` in `XFactory`; `const varsResolver = createVarsResolver<XFactory>(...)`; pass it to `useStyles`; `X.varsResolver = varsResolver`.
3. CSS reads `var(--x-name, <today's value>)`.
4. Add the new stylesNames to the union and spread `getStyles(...)` on those elements. Move `c=`/`fw=` on styled Text into the CSS module (they become inline styles and beat `classNames`, styles-api-9).
5. Pass `unstyled={unstyled}` to every child component in the "Forward unstyled" column.
6. Tests: `varsResolver: true` and the new selectors in `itSupportsSystemProps`. A test that `vars` / `radius` / `color` sets the variable on the root (`toHaveStyle`). An `unstyled` test: no `.mantine-<Child>-root` classes inside. Add `tests.axe([...])` over the default render and one busy state.

| Lane | Model | Files (owned) | Work | Done-check |
| --- | --- | --- | --- | --- |
| A0 pattern | Opus | `ChatThread/*` | ChatThread row of the table: radius, color, autoContrast, avatarSize; 5 vars; avatarSpace width from `--chat-thread-avatar-size`; forward unstyled to MessageActions/Attachments/Reactions/Avatar; tests + axe | `npm run typecheck`; `npx jest package/src/ChatThread`; oxlint + stylelint on touched files; the Messages story looks the same as before with no props set (lead checks in the browser) |
| A1 | Sonnet | `Message/*`, `TeamThread/*` | Message `avatarSize` + `--message-avatar-size`, Message.Avatar takes size from context and accepts `radius`; TeamThread `avatarSize` forwarded, `threadAvatars`/`threadCount`/`threadLastReply`, styles-api-9 Text props to CSS, forward unstyled | jest on both folders; typecheck; changing avatarSize changes the grid column and the Avatar together (test reads both) |
| A2 | Sonnet | `Composer/*` | `size`, `radius`, `--composer-radius`; children sized from them (ActionIcon `input-${size}`); `replyLabel`/`replyAuthor`/`replyBody`/`cancelReply`/`section`; `leftSection`/`rightSection`; drop `ComposerDraft.attachments` (api-3); forward unstyled | jest Composer; typecheck (also docs: `npm run typecheck` covers it); e2e Composer story by eye: a default ActionIcon size change from lg to input-sm is acceptable only if the lead agrees; otherwise map sm->lg |
| A3 | Sonnet | `Inbox/*` | `color`, `variant`, `autoContrast`, `radius`; `--inbox-radius`, `--inbox-active-bg/-color/-hover` via `theme.variantColorResolver` (copy NavLink's resolver); forward unstyled | jest Inbox; typecheck; a `color="teal"` test sets `--inbox-active-bg` |
| A4 | Sonnet | `MessageActions/*`, `Reactions/*`, `Attachments/*` | MessageActions size/radius/variant/color pass-through, `menu`/`menuItem` via Menu classNames; Reactions radius/color + 3 vars + `emoji`/`count`; Attachments radius + 3 vars + `fileIcon`/`fileName`/`fileSize`; D6 Toolbar prototype written up as a note, not merged unless the lead agrees | jest on the 3 folders; typecheck |
| A5 | Sonnet | `AssistantThread/*`, `MarkdownBody/MarkdownBody.tsx` + `.module.css` + test | AssistantThread `radius` + 3 vars; the 7 new selectors (`stepChevron` takes over the `& > svg` rules, `stepBadge` replaces `ms="auto"`); MarkdownBody `codeLanguage`; forward unstyled | jest on both folders; typecheck |
| A6 | Sonnet (small) | `MessagesShell/*` | `--shell-radius` -> `--messages-shell-radius`; add list/aside width vars; `varsResolver: true` and the `asideBackdrop`/`asideToggle` selectors in the test | jest MessagesShell; `grep -r "shell-radius" package docs` shows only the new name |

The lead does not edit `index.ts` or `docs/styles-api/index.ts` during phase A; C1 collects them.
A lane that adds an exported type (`XCssVariables`) exports it from its own file only.

### Phase B: API restructure

**B1 renames (alone, Sonnet).** Commit a small codemod script first, then its output.
- `controlRef` -> `handlersRef`; `MessageListControl` -> `MessageListHandlers` (MessageList, ChatThread, TeamThread, ThreadPanel, AssistantThread, docs, demos, stories, e2e).
- Reactions `onToggle` -> `onToggleReaction` (drop `ElementProps<'div', 'onToggle'>` Omit); MessageActions `onThread` -> `onOpenThread`; Inbox `search`/`defaultSearch` -> `searchValue`/`defaultSearchValue` (the last two are "consider": include them only if Steve agrees to the whole batch).
- Done-check: `npm run typecheck` (package + docs); `npx jest`; `grep -rn "controlRef\|MessageListControl\|onToggle=\|onThread=" package/src docs e2e` returns nothing.

**B2 ThreadPanel frame (Opus).** Owns `ThreadPanel/*`.

```tsx
<ThreadPanel title="Thread" subtitle="#design" onClose={close}>
  <ThreadPanel.Replies
    parent={parent}
    replies={replies}
    users={users}
    currentUserId={me}
    onReact={react}
    renderBody={(m) => <MarkdownBody>{m.body}</MarkdownBody>}
    handlersRef={handlers}
  />
  <Composer onSend={reply} />
</ThreadPanel>
```

- `ThreadPanelProps` (frame, about 9 own props): `title` (ReactNode, default 'Thread'), `subtitle`, `titleOrder`, `onClose`, `withCloseButton`, `closeButtonProps`, `withFocusManagement`, `labels: { close }`, `children`.
- `ThreadPanel.Replies`: `factory` with `compound: true`; props `Omit<TeamThreadProps, 'items' | 'threadParentId'> & { parent: ChatMessage; replies: ChatMessage[] }`; renders `<TeamThread items={[parent, ...replies]} threadParentId={parent.id} {...others} {...ctx.getStyles('thread')} />` and reports `parent.id` to the frame through context, so the title-focus effect still runs when the thread changes.
- Composer placement: children after Replies get the `composer` selector through a `ThreadPanel.Footer` static (a Box with getStyles('composer')); a bare child is allowed too.
- Context: `createSafeContext('ThreadPanel component was not found in tree')`; `tests.itThrowsContextError` for Replies and Footer.
- Done-check: jest ThreadPanel (focus tests unchanged in intent); typecheck; the TeamThread story's panel works in the browser (open, title focused, close, focus back).

**B3 thread parts (Opus).** Owns `ChatThread/*`, `TeamThread/*` (after A0/A1 merged).

```tsx
<ChatThread
  messages={messages}
  users={users}
  currentUserId={me}
  onReply={reply}
  renderMessage={(message, context) => (
    <ChatThread.Message message={message} context={context}>
      <ChatThread.Quote />
      <ChatThread.Bubble>
        <MarkdownBody>{message.body}</MarkdownBody>
        <ChatThread.Actions />
      </ChatThread.Bubble>
      <ChatThread.Attachments />
      <ChatThread.Reactions />
      <ChatThread.Meta />
    </ChatThread.Message>
  )}
/>
```

- Statics, each a `factory` with `compound: true` that styles itself through the thread context's `getStyles` (no new stylesNames; the root union keeps them, as Lightbox does). ChatThread: `Message` (row; provides a row context: message, own, groupStart/End, highlighted, lastOwn, jumpTo), `Avatar`, `Quote`, `Bubble`, `Actions`, `Attachments`, `Reactions`, `Meta`. TeamThread: `Message`, `Author`, `Text`, `Attachments`, `Reactions`, `ThreadSummary`, `Actions`, `Event`.
- The default `renderMessage` is today's ChatRow/TeamRow rebuilt from the parts. Keep the `memo` and the stable shared value (the context value is the `shared` object that already exists).
- TeamThread gets `renderBody` (api-6). The Factory types gain `staticComponents`.
- Done-check: every existing ChatThread/TeamThread test passes unchanged; new tests render a custom row from the parts; `tests.itThrowsContextError` for each part; a render-count test (already present for memo rows) still passes.

**B4 markdown adapter (Sonnet, the design below is fixed).** Owns `MarkdownBody/*`, `markdown.ts`, `assistant.ts`, `index.ts`, `package/package.json`, `rollup.config.mjs`, `scripts/check-markdown-blocks.tsx`, `test-utils/react-markdown.mock.tsx`, `test-utils/remark-gfm.mock.ts`, `jest.config.cjs` (if it maps the mocks), `README.md` install section.

```ts
export interface MarkdownRenderers { a: Component<'a'>; code: Component<'code'>; pre: Component<'pre'> }
export interface MarkdownAdapter {
  /** Renders one top-level block of markdown; renderers are MarkdownBody's Mantine elements */
  render: (markdown: string, renderers: MarkdownRenderers) => React.ReactNode;
  /** false when a plugin can change block boundaries: MarkdownBody then renders the text whole */
  splitBlocks?: boolean;
}
export const plainTextMarkdownAdapter: MarkdownAdapter;        // text with line breaks, default
export function createReactMarkdownAdapter(
  Markdown: React.ComponentType<any>,
  options?: { remarkPlugins?: unknown[]; components?: Record<string, React.ComponentType<any>> }
): MarkdownAdapter;                                              // caller passes [remarkGfm] itself
export function MarkdownAdapterProvider(props: { adapter: MarkdownAdapter; children: React.ReactNode }): React.JSX.Element;
// MarkdownBody also takes `adapter?: MarkdownAdapter` (overrides the provider for one instance)
```

- No import of react-markdown/remark-gfm anywhere in `package/src`. Remove both from peers. Remove the `./markdown` and `./assistant` exports and `typesVersions`; MarkdownBody, AssistantThread and getAssistantText go into `index.ts`.
- `scripts/check-markdown-blocks` and the tests keep react-markdown as a devDependency and build the adapter with it.
- Done-check: `npm run build && npm run check:exports && npm run check:markdown`; `grep -rn "from 'react-markdown'\|from 'remark-gfm'" package/src` returns nothing (tests excepted); jest MarkdownBody + AssistantThread; a test that AssistantThread renders plain text with no provider.

### Phase C: public surface and docs

**C1 (alone, Sonnet).** Owns `index.ts`, `docs/styles-api/index.ts`, `docs/docs.mdx`, `docs/docgen.json` (generated), `CHANGELOG.md`, `README.md`.
- Export every new `XCssVariables`, the new part types and the adapter API.
- Lightbox-style `export namespace X { Props; StylesNames; Factory; CssVariables; Labels; namespace Part { Props } }` for every component (parity-4). Add an `index.test.ts` type test.
- Styles API data: new selectors and variables per component; `npm run docgen`.
- docs.mdx: "Theming" (radius/color/vars), "Compound components" (B2/B3), "Markdown adapter" (B4), "Labels", "Keyboard". Text goes before each demo.
- Done-check: `npm test` (full); `npm run docs:build`; the docs Styles API tab lists the new selectors and vars.

**C2 (parallel by section, Sonnet).** One small demo file per docs section (`docs/demos/<Section>.demo.tsx`), and per-component stories moved beside the components with their e2e story ids updated (D7). The lead runs `npm run e2e`. Done-check: `npm run e2e` green in all three browsers; docs build.

## After the plan

- Publish 0.1.0 to npm (Steve's call). Then open the community-listing PR to `extensions.mdx` (Steve's call; never automated).
- An upstream GitHub Discussion, if wanted, proposes the parts only: MessageList (chat log primitive), MarkdownBody with adapters, Composer. Show the compound API, theming vars, the tests (`itSupportsSystemProps` + `axe`) and the demos.
- Not planned: global stores (D1), exact peer pinning, `.js` specifiers, `@mantine/...` displayNames, inline-comment removal. These matter only inside the monorepo.

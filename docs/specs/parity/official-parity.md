# Official-parity review: mantine-messages @ 4799bf9 vs Mantine 9.8.0 extensions

Reference: `~/.cache/mantine-review/mantine-9.8.0` (REF below). The `modals`, `notifications` and `store`
packages and `core/src/core` were added to the cached sparse checkout for this review (the skill
script does not fetch them). Package paths are under `/Users/stevo/src/mantine-messages/package/src`.
Every must/should finding below was checked by reading the code; refuted or downgraded claims are
listed at the end.

## Measured: own props per component

Own props are properties declared in the package itself. Props inherited from `BoxProps`,
`StylesApiProps`, `ElementProps`, React or core are not counted. Measured with a TypeScript-checker
script (`parity/tools/count-props.cjs`), run on both trees the same way.

| Official component | Own props | Ours | Own props |
| --- | ---: | --- | ---: |
| DropzoneFullScreen | 35 | ThreadPanel | **25** (14 are TeamThread pass-throughs) |
| Dropzone | 31 | ChatThread | 20 |
| JsonViewer | 29 | Composer | 20 |
| Lightbox (default composition) | 26 | TeamThread | 20 |
| CarouselVariables / Carousel | 25 / 24 | MessageList | 13 |
| LightboxRoot | 24 | MessageActions | 11 |
| CodeHighlight / CodeHighlightTabs | 22 / 22 | Inbox | 11 |
| LightboxProvider | 22 | MessagesShell | 6 |
| Spotlight / Spotlight.Root (+ Modal props) | 21 / 14 | AssistantThread | 6 |
| ConfirmModal | 10 | MarkdownBody | 4 |
| Spotlight.Action | 10 | Reactions | 4 |
| Lightbox parts (Slide, Caption, Toolbar...) | 0-3 | Attachments | 3 |
| Carousel.Slide, Dropzone.Accept/Reject/Idle | 0-1 | Message / .Avatar / .Body / .Meta | 1 / 2 / 0 / 0 |
| | | MessagesShell.List / Main / Aside / AsideToggle | 0 / 0 / 0 / 1 |

**No component goes over the ~30 ceiling.** Our largest, ThreadPanel at 25, sits below Lightbox at 26.
Prop count is not the gap. The gap is **composition**. The three threads and Composer are closed
boxes: a fixed private row (`ChatRow`, `TeamRow`, `Answer`) or fixed markup, with one escape hatch
(`renderBody`, on ChatThread only). The official extensions ship parts as statics that share the
root's Styles API through `createSafeContext` (Lightbox has 9 statics, Spotlight 7, Carousel 1,
Dropzone 3). Two of ours already do this: `Message` and `MessagesShell`.

## Findings

```
id: parity-1
file: ThreadPanel/ThreadPanel.tsx:83-112, 258-276
severity: should (+ breaking)  [restructure]
claim: ThreadPanel re-declares 14 TeamThread props and forwards each by hand (actions, onReact, onEdit, onToggleReaction, onOpenAttachment, unreadAfterId, groupWindow, autoScroll, onLoadOlder, hasOlder, loadingOlder, controlRef, locale, labels); every new TeamThread prop needs a third edit here. Official frames compose their body as children instead (Lightbox.Root + parts; Drawer/Modal take children).
evidence: <TeamThread items={[parent, ...replies]} threadParentId={parent.id} users={users} currentUserId={currentUserId} locale={locale} actions={actions} onReact={onReact} ... controlRef={controlRef} labels={threadLabels} unstyled={unstyled} {...getStyles('thread')} />
  REF lightbox/src/Lightbox.tsx:17-28 (Lightbox.Root/Toolbar/Slides/... statics), LightboxBase.tsx:62-80 (default composition is just the parts)
fix: ThreadPanel becomes a frame (header, title, close button, focus management, children). The replies list becomes a static, `ThreadPanel.Replies` (TeamThread in thread mode). See plan.md R2 for the API.
cost: ThreadPanel drops from 25 own props to about 9; the pass-through code and the `ThreadPanelLabels extends TeamThreadLabels` merge go away. Callers write one more element.
confidence: high
verified: confirmed (lines read; the count was measured)
```

```
id: parity-2
file: ChatThread/ChatThread.tsx:211-334 ; TeamThread/TeamThread.tsx:216-330 ; AssistantThread/AssistantThread.tsx:351-420
severity: should  [restructure]
claim: Rows are private memo components (ChatRow, TeamRow, Answer), so a consumer cannot recompose a row (custom bubble, extra badge, markdown in TeamThread) except through `renderBody`, and only ChatThread has `renderBody`. TeamThread prints `message.body` raw, so team chat cannot render markdown at all.
evidence: TeamThread.tsx:301-302  <Box {...getStyles('text')}>{message.body} ...
  ChatThreadProps.renderBody exists; TeamThreadProps / ThreadPanelProps have none (measured prop lists).
  REF spotlight: Spotlight.Action / ActionsGroup / Empty / Footer are exported parts users map themselves; lightbox: Lightbox.Slide is the row users map in Lightbox.Slides.
fix: add `renderBody` to TeamThread (needed now), then the parts and a `renderMessage` render prop (plan.md R3): ChatThread.Message/Avatar/Quote/Bubble/Actions/Attachments/Reactions/Meta and TeamThread.Message/Author/Text/Attachments/Reactions/ThreadSummary/Actions, all `compound: true` on the thread's getStyles.
cost: additive; the default rows stay as they are.
confidence: high
verified: confirmed
```

```
id: parity-3
file: MarkdownBody/MarkdownBody.tsx:21-22 ; package/package.json (exports ./markdown, ./assistant; peerDependencies react-markdown, remark-gfm optional)
severity: should (+ breaking)  [restructure]
claim: MarkdownBody imports react-markdown and remark-gfm directly, which forces two extra entry points (`./markdown`, and `./assistant` because AssistantThread renders MarkdownBody) and two optional peers. code-highlight handles its optional engine with an adapter the consumer builds from the engine instance it already imports: no peer, one entry, plain-text fallback.
evidence: import Markdown, { type Components, type Options } from 'react-markdown'; import remarkGfm from 'remark-gfm';
  REF code-highlight/package.json: peers are only @mantine/core, hooks, react, react-dom; exports only "." and css
  REF code-highlight/src/CodeHighlightProvider/adapters/highlight-js-adapter.ts:3  export function createHighlightJsAdapter(hljs: any): CodeHighlightAdapter
  REF .../plain-text-adapter.ts (default), CodeHighlightProvider.tsx:46-51 (context default = plainTextAdapter)
fix: a `MarkdownAdapter` interface, `plainTextMarkdownAdapter` (default), `createReactMarkdownAdapter(Markdown, { remarkPlugins, components })` and `MarkdownAdapterProvider`, as plan.md R4 describes. MarkdownBody keeps block splitting and the Mantine renderers (link, code, pre) and renders each block through the adapter. Both components then move into the root entry; delete `./markdown` and `./assistant` and the optional peers.
cost: one entry like every official extension. AssistantThread works without react-markdown (plain text until an adapter is set). The react-markdown `Components`/`Options` types leave the public .d.ts. Breaking for imports (unpublished, so free now).
confidence: high
verified: confirmed (MarkdownBody fits: what it adds over react-markdown is engine-agnostic: block splitting, Mantine renderers, labels, Styles API)
```

```
id: parity-4
file: all component files (no `export namespace`) ; index.ts
severity: should  [align]
claim: Mantine 9 exposes `Component.Props / .StylesNames / .Factory / .CssVariables` (and `Component.Part.Props`) as type namespaces. There are 190 such declarations in the installed core and Lightbox has them; this package has none.
evidence: node_modules/@mantine/core/lib/components/Tabs/Tabs.d.ts: export declare namespace Tabs { type Props = TabsProps; ... namespace Tab { type Props = TabsTabProps; ... } }
  REF lightbox/src/index.ts:101-149 export namespace Lightbox { ... namespace Root {...} ... }
  grep -rl "export declare namespace" node_modules/@mantine/core/lib/components | wc -l  -> 190 ; package/src -> 0
fix: in index.ts add `export namespace ChatThread { export type Props = ChatThreadProps; StylesNames; Factory; Labels; CssVariables }` per component, with nested namespaces for parts (Message.Avatar, MessagesShell.List, ...), the way Lightbox does.
cost: additive, types only.
confidence: high
verified: confirmed
```

```
id: parity-5
file: */*.tsx (all but MessagesShell) ; MessagesShell/MessagesShell.tsx:29
severity: should  [align]
claim: Only MessagesShell has a varsResolver, and its variable `--shell-radius` breaks the `--<component-kebab>-*` naming every official extension uses. No other component exports `*CssVariables`, has `vars` in its Factory, or has size/radius/color props. Official ones do: Lightbox (`--lightbox-*`, 5 vars), Carousel (`controlSize`, `slideGap`), Dropzone (`radius`, `acceptColor`, `rejectColor`), CodeHighlight (`radius`, `background`).
evidence: export type MessagesShellCssVariables = { root: '--shell-radius' };
  REF lightbox/src/LightboxRoot/LightboxRoot.tsx:62-69 LightboxCssVariables root: '--lightbox-transition-duration' | '--lightbox-overlay-color' | '--lightbox-z-index' | ...
  REF carousel/src/Carousel.tsx:491, dropzone/src/Dropzone.tsx:362, code-highlight/.../CodeHighlight.tsx:344  X.varsResolver = varsResolver
fix: plan.md "Theming contract" table (per component: props, vars, CSS fallback, the new stylesNames). Rename `--shell-radius` to `--messages-shell-radius`. Set `X.varsResolver = varsResolver` and `varsResolver: true` in each test.
cost: mostly additive; renaming --shell-radius breaks consumer CSS (unpublished).
confidence: high
verified: confirmed (supersedes styles-api-6 and api-shape-2; details in api-shape.md)
```

```
id: parity-6
file: */*.test.tsx (13 files)
severity: should  [align]
claim: No test runs `tests.axe`. Carousel, Lightbox and Pagination each run it over the default render, and @mantine-tests/core 2.0.0 (installed) exports it, with axe-core and jest-axe present in node_modules.
evidence: grep "tests.axe" package/src -> none
  REF carousel/src/Carousel.test.tsx:17  tests.axe([<Carousel {...defaultProps} />]);  lightbox/src/Lightbox.test.tsx:152
fix: add `tests.axe([<X {...defaultProps} />, <X {...defaultProps} withSomething />])` to each component test, covering the states with extra markup (reply quote, unread line, loader, error answer, open step).
cost: catches ARIA regressions in jsdom on every commit; a few seconds of test time.
confidence: high
verified: confirmed
```

```
id: parity-7
file: Message/Message.test.tsx:70 ; MessagesShell/MessagesShell.test.tsx:192, 53-64
severity: consider  [align]
claim: The compound-part context errors are tested by hand rather than with `tests.itThrowsContextError`. MessagesShell's system-props test does not pass `varsResolver: true`, although the component has one.
evidence: expect(() => render(<Message.Body>Hi</Message.Body>)).toThrow('...')
  REF carousel/src/CarouselSlide/CarouselSlide.test.tsx:21 tests.itThrowsContextError({ component: CarouselSlide, props, error: 'Carousel component was not found in tree' })
fix: swap to the helper; add `varsResolver: true`; use the official error wording ("<Root> component was not found in tree").
cost: none
confidence: high
verified: confirmed
```

```
id: parity-8
file: Messages.story.tsx, Assistant.story.tsx, MessagesShell.story.tsx, WorkQueue.story.tsx (package/src root)
severity: consider  [align]
claim: Stories are grouped at the package root by scenario. Official stories sit beside each component (`Carousel/Carousel.story.tsx`, `export default { title: 'Carousel' }`), one file per component.
evidence: REF carousel/src/Carousel.story.tsx:6 export default { title: 'Carousel' };
fix: move each scenario's per-component stories into `<Component>/<Component>.story.tsx`; keep the composed demos (Messenger, WorkQueue) as one `Examples.story.tsx`. The e2e specs use story ids, so update `harness/` and `e2e/` selectors at the same time.
cost: e2e story ids change.
confidence: medium
verified: confirmed (placement only; the template's default layout was not checked)
```

```
id: parity-9
file: docs/docs.mdx ; docs/demos/index.ts
severity: consider  [align]
claim: The docs page has 4 live demos, all full apps (Messenger, Assistant, WorkQueue, WorkQueueSplit); the other sections show static code. The official extension pages have one small demo per feature: lightbox.mdx has 14 `<Demo>` blocks and 17 demo files, with sections for Store API, Compound components, Labels, Accessibility and Keyboard shortcuts.
evidence: grep -c "<Demo" docs/docs.mdx -> 4 ; REF apps/mantine.dev/src/pages/x/lightbox.mdx -> 14
fix: one demo per section (usage, replies, actions, long threads, panes, team chat, message parts, markdown adapter, assistant, inbox, composer, theming with radius/color), each with its code; add "Compound components", "Labels", "Styles API vars" and "Keyboard" sections.
cost: docs work only.
confidence: high
verified: confirmed
```

```
id: parity-10
file: package/src (98 `//` comment lines in 5.4k non-test LOC; top: use-message-list.ts 18, AssistantThread.tsx 15, TeamThread.tsx 10)
severity: consider  [upstream-only]
claim: The maintainer's written rule (REF CLAUDE.md "Do not include inline comments that describe logic") would require removing these before a merge. Official code itself varies: lightbox has 62 inline comment lines in 3.0k LOC, carousel 0, code-highlight 1.
evidence: REF CLAUDE.md, Code Style section
fix: only when proposing code upstream: turn the "why" comments into JSDoc on the helper or drop them. Keep them in the standalone repo; they carry the reasoning.
cost: none now
confidence: high
verified: confirmed
```

```
id: parity-11
file: package/package.json ; index.ts ; every displayName
severity: consider  [upstream-only]
claim: Monorepo details that differ: peers pinned to the exact release (`"@mantine/core": "9.8.0"`) instead of `^9.8.0`; `.js` specifiers in index.ts; displayName `@mantine/<pkg>/<Component>` (ours: `ChatThread`); `[@mantine/x] Component: message` commit style; version and changelog shared with the monorepo.
evidence: REF lightbox/package.json peers "9.8.0"; REF lightbox/src/index.ts './Lightbox.js'; REF carousel test displayName: '@mantine/carousel/Carousel'
fix: none in the standalone repo (a ^ range is right for a community package). Note it in the upstream proposal.
cost: none
confidence: high
verified: confirmed
```

```
id: parity-12
file: Composer/Composer.tsx ; MessageActions/MessageActions.tsx:117-125, 280-292
severity: consider  [align]
claim: Two core 9.8 components overlap hand-rolled parts. `Toolbar` gives roving arrow-key focus with RTL, `loop`, and size/radius/color, which MessageActions implements itself in KEYS plus the onKeyDown handler. `Mentions` is a candidate for @-mentions in Composer.
evidence: node_modules/@mantine/core/lib/components/Toolbar/Toolbar.d.ts (ToolbarProps: orientation, loop, size, radius, withBorder, color); esm/components/Toolbar/use-toolbar-navigation.mjs:38 handles RTL arrows over [data-toolbar-toggle]
fix: prototype MessageActions on `Toolbar` + `Toolbar.Toggle` (polymorphic button, `active` optional). Adopt it if the overflow Menu and the one-tab-stop behaviour survive; otherwise keep the current code and record why.
cost: about 30 lines of key handling removed; size/radius/color would come from Toolbar.
confidence: low (fit not proven: Toolbar.Toggle is meant for toggles)
verified: unsure, a lead for the mantine-usage owner, not a confirmed finding
```

## Imperative control: store or not (Spotlight / Lightbox / modals)

| Official | Why it has a store | Shape |
| --- | --- | --- |
| Spotlight | one overlay per page, opened from anywhere (hotkey, any button) | `createSpotlight()` -> `[store, actions]`, default singleton, `store` prop for more instances |
| Lightbox | same: an overlay opened from any thumbnail | `createLightbox()` -> `[store, actions]`, statics `Lightbox.open/close/next/prev/setIndex` |
| modals / notifications | app-wide queue | Provider + global event API |
| Combobox, Tree (core) | per-instance state that several parts and the app drive | `store={useCombobox()}`, `tree={useTree()}` |
| NumberInput, Dropzone, Carousel | one imperative call | `handlersRef`, `openRef`, `getEmblaApi` |

Our candidates:

| Case | Today | Store? | Recommendation |
| --- | --- | --- | --- |
| Scroll to a message and flash it | `controlRef: Ref<MessageListControl>` on MessageList, ChatThread, TeamThread, ThreadPanel, AssistantThread | No global store: two lists are often on screen together (TeamThread plus ThreadPanel in the docs' team-chat example), so a singleton `messages.jumpTo()` would be ambiguous | Keep a ref; rename `controlRef` to `handlersRef` and `MessageListControl` to `MessageListHandlers` (core `NumberInput.handlersRef: Ref<NumberInputHandlers>`). In core, `controlRef` means a DOM button ref (`Spoiler.controlRef?: Ref<HTMLButtonElement>`). |
| Reply target shared by thread and Composer | app state: `onReply` sets `replyTo`, Composer reads it | Possible: a per-instance `useConversation()` store like Combobox, passed to both | Not now: controlled props are the core convention and the glue is 3 lines; revisit if a "messages app" wrapper is built |
| Which thread is open (TeamThread `selectedId`, ThreadPanel `parent`) | app routing state | No: it is routing, not overlay state | The ThreadPanel frame restructure (parity-1) removes the drilling; no store needed |

## Merge readiness

| Route | Ready? | What is missing |
| --- | --- | --- |
| Community listing (PR adding a link to `apps/mantine.dev/src/pages/x/extensions.mdx`, REF lines 75-82) | Nearly | Publish to npm (`package/package.json` is `0.0.0`); docs site exists (homepage set); template-based harness is in place |
| Upstream as an official `@mantine/*` package | No, and the docs say official extensions are built by the maintainers | Start a GitHub Discussion (REF contribute.mdx, "discuss it with the maintainer ... before jumping into coding") |
| Upstream in part | The best candidates | (1) **MessageList**: chat log primitive (stick to bottom, load older keeping position, jump and flash, `aria-busy` while prepending), generic and engine-free. (2) **MarkdownBody** with the adapter, the same shape as code-highlight. (3) **Composer**: chat input with modes, reply bar and stop. Inbox, the three threads, ThreadPanel and the work-queue example are app-level and would stay community |

A Discussion would need to show: the compound API (after R2/R3), the theming contract (vars per
component), tests with `tests.itSupportsSystemProps` + `tests.axe`, demos per feature, and a
statement of scope (which part to propose).

## Refuted or downgraded

- "Some components exceed ~30 own props": refuted by measurement (max 25).
- "Refs only for DOM nodes; controlRef must become a store": refuted. Official and core code use
  function refs (Dropzone `openRef`, NumberInput `handlersRef`). Only the name changes (api-shape-1).
- "Console warnings do not fail tests": refuted. `jsdom.mocks.cjs:104` already fails a test on
  console.error/warn, as in REF jsdom.mocks.ts.
- "No @mantine-tests/core helpers": refuted. 13 test files run `tests.itSupportsSystemProps` with
  stylesApiSelectors, plus `itSupportsAttributes`.

# API-shape review: mantine-messages @ 4799bf9 vs Mantine 9.8.0 core types

Analogues were read from `node_modules/@mantine/core/lib/components/*/*.d.ts` (installed 9.8.0).
Package paths are under `/Users/stevo/src/mantine-messages/package/src`. Since the previous round,
fixes have landed for Composer `inputRef`/`textareaProps`/`readOnly`, `genericFactory` on
MessageList, `labels.newMessages`, `labels.empty`, ThreadPanel `withCloseButton`/`closeButtonProps`,
and the Message factory exports. Findings below are only what is still open.

## Summary

| Severity | Count | Ids |
| --- | ---: | --- |
| should (breaking) | 4 | api-1, api-2, api-3, api-4 |
| should | 3 | api-5 (theming contract), api-6, api-7 |
| consider (breaking) | 3 | api-8, api-9, api-10 |
| consider | 2 | api-11, api-12 |

## Findings

```
id: api-1
file: MessageList/MessageList.tsx:54-57,107 ; ChatThread.tsx:142 ; TeamThread.tsx:154 ; ThreadPanel.tsx:109 ; AssistantThread.tsx:107
severity: should (+ breaking)
claim: The imperative handle is `controlRef: Ref<MessageListControl>`. In core, `controlRef` is a DOM ref to a button (Spoiler); the core name for a ref that holds functions is `handlersRef: Ref<XHandlers>` (NumberInput).
evidence: package: controlRef?: React.Ref<MessageListControl>;  export interface MessageListControl { jumpTo(...) }
  Mantine: NumberInput.d.ts:69  handlersRef?: React.Ref<NumberInputHandlers | undefined>;  Spoiler.d.ts  controlRef?: React.Ref<HTMLButtonElement>
fix: rename `controlRef` to `handlersRef` and `MessageListControl` to `MessageListHandlers` across the 5 components, the docs and the demos. The `useImperativeHandle` body stays the same.
cost: a user who knows NumberInput guesses the name; no clash with Spoiler's meaning. Breaking (unpublished).
confidence: high
verified: confirmed (both core .d.ts read)
```

```
id: api-2
file: ThreadPanel/ThreadPanel.tsx:34-40, 183, 229-237
severity: should (+ breaking)
claim: The panel heading is set through `labels.title`, while every core frame takes `title: ReactNode` as a prop. `labels` is meant for accessibility and translation strings, and the heading is content.
evidence: package: interface ThreadPanelLabels extends TeamThreadLabels { title: string; close: string }  ->  <Title ...>{titleLabel}</Title>
  Mantine: Drawer.d.ts:15 / Modal.d.ts:16  title?: React.ReactNode;  closeButtonProps; (labels-style strings are aria only)
fix: `title?: React.ReactNode` (default 'Thread'); keep `labels.close`; `aria-label` of the region falls back to `title` when it is a string. Ship with the frame restructure (official-parity-1 / plan.md R2).
cost: the title can hold a channel chip or an icon. Breaking.
confidence: high
verified: confirmed
```

```
id: api-3
file: Composer/Composer.tsx:40-45, 259-266
severity: should (+ breaking)
claim: `ComposerDraft.attachments: File[]` is public but always `[]`: Composer has no way to add files and no slot to put a FileButton or Dropzone into. Core inputs take `leftSection`/`rightSection` for that.
evidence: package: attachments: File[];  ...  onSend?.({ text, format, attachments: [], ... })
  Mantine: Input.d.ts:28,36  leftSection?: React.ReactNode; rightSection?: React.ReactNode; (+ leftSectionProps/rightSectionProps)
fix: drop `attachments` from ComposerDraft now. Add `leftSection` and `rightSection` (rendered in `field` beside the textarea, with stylesNames `section`), so apps can drop in `<FileButton>` and keep their own file list. Bring `attachments` back only together with a pill row (`attachments`/`defaultAttachments`/`onAttachmentsChange` via useUncontrolled).
cost: the type stops promising something the component never does; attach and emoji buttons get a slot. Breaking for anyone reading draft.attachments (always empty anyway).
confidence: high
verified: confirmed (grep finds no other writer of attachments)
```

```
id: api-4
file: MessagesShell/MessagesShell.tsx:29 ; MessagesShell.module.css:7
severity: should (+ breaking)
claim: The CSS variable is `--shell-radius`; core and every official extension prefix variables with the component name in kebab case.
evidence: package: MessagesShellCssVariables = { root: '--shell-radius' }
  Mantine: '--lightbox-z-index', '--carousel-control-size', '--toolbar-radius' (Toolbar.d.ts), '--nl-bg' (NavLink, abbreviated but still its own prefix)
fix: `--messages-shell-radius`; add `--messages-shell-list-width` and `--messages-shell-aside-width` (resolver returns undefined; the CSS falls back to rem(300px) / rem(280px)).
cost: no clash with app variables named --shell-*. Breaking for consumer CSS.
confidence: high
verified: confirmed
```

```
id: api-5
file: every component but MessagesShell (see table below)
severity: should
claim: No size/radius/color props: Avatar, ActionIcon, SegmentedControl, TextInput and bubble sizes and radii are hard-coded, and values that must agree live in two files (ChatThread avatar size="sm" vs .avatarSpace rem(26px); Message.Avatar size={36} vs grid rem(36px)). The theming contract table below lists, per component, the props, CSS variables, CSS fallbacks, the new stylesNames and where `unstyled` must be forwarded.
evidence: package: Composer.tsx:299-300 <SegmentedControl size="xs" radius="xl">, :360-361 <ActionIcon radius="xl" size="lg">; ChatThread.tsx:268 <Avatar size="sm">, ChatThread.module.css:143 width: rem(26px); Message.tsx:59-60 size={36} radius="md", Message.module.css:4 rem(36px)
  Mantine: Toolbar.d.ts size/radius/color/autoContrast + ToolbarCssVariables; NavLink varsResolver uses theme.variantColorResolver -> --nl-bg/--nl-color/--nl-hover
fix: implement the table (plan.md lanes A1-A6).
cost: theme.components.X.defaultProps.radius etc. work as in core; drifting magic numbers are gone. Additive except where noted.
confidence: high
verified: confirmed; supersedes styles-api-6 and api-shape-2; includes styles-api-5, -7 and -8, all still open at 4799bf9 (ChatRow passes no `unstyled` to MessageActions/Attachments/Reactions; AssistantThread Step/ToolDetails/PromptEditor and the Reactions/Attachments/Composer inner spans still have no selector)
```

```
id: api-6
file: TeamThread/TeamThread.tsx:89-155, 301-302 ; ThreadPanel props
severity: should
claim: `renderBody` exists only on ChatThread. TeamThread (and therefore ThreadPanel) prints `message.body` raw, so Slack-style markdown cannot be rendered in team chat. Core offers the same render prop on every member of a family (Select, MultiSelect, Autocomplete and TagsInput all have `renderOption`).
evidence: package: <Box {...getStyles('text')}>{message.body} ...  ; ChatThreadProps.renderBody?: (message: ChatMessage) => React.ReactNode
fix: add `renderBody` to TeamThread, and to ThreadPanel.Replies after R2; it goes through TeamRowShared like ChatThread's.
cost: additive.
confidence: high
verified: confirmed (previous api-shape-13, raised from consider because the gap blocks a basic use)
```

```
id: api-7
file: index.ts
severity: should
claim: There are no `Component.Props`-style type namespaces (Mantine 9 convention, 190 declarations in core). See official-parity-4; it is listed here because consumers type wrappers with them (`ChatThread.Props`).
fix: as official-parity-4.
verified: confirmed (duplicate of parity-4, kept in parity)
```

```
id: api-8
file: Reactions/Reactions.tsx:27-31 ; ChatThread.tsx:315 ; TeamThread.tsx:320
severity: consider (+ breaking)
claim: Reactions' callback is `onToggle`, which shadows the native DOM `onToggle` (hence `ElementProps<'div', 'onToggle'>`), while the threads call it `onToggleReaction`.
fix: rename to `onToggleReaction(emoji)`; drop the Omit. Ship with api-1 so all the breaking renames land at once.
verified: confirmed (previous api-shape-9, still open)
```

```
id: api-9
file: MessageActions/MessageActions.tsx:63-66 vs TeamThread.tsx:102
severity: consider (+ breaking)
claim: `onThread` on MessageActions vs `onOpenThread` on TeamThread for the same action.
fix: `onOpenThread` everywhere.
verified: confirmed (previous api-shape-8, still open)
```

```
id: api-10
file: Inbox/Inbox.tsx:85-96
severity: consider (+ breaking)
claim: `search`/`defaultSearch`/`onSearchChange` vs core Select `searchValue`/`defaultSearchValue`/`onSearchChange` (+ `searchable`).
fix: rename the value pair to `searchValue`/`defaultSearchValue`; `withSearch` may stay (a `with*` boolean is also core style).
verified: confirmed (previous api-shape-11, still open)
```

```
id: api-11
file: Inbox/Inbox.tsx:178-205, 330-345
severity: consider
claim: Inbox rows cannot be customised (no render prop, no part). Core list-like components offer `renderOption` (Select) or an exported item part (Spotlight.Action).
fix: export `Inbox.Item` (compound, Inbox getStyles, `conversation` + `active` props) and `renderConversation?: (conversation, { active }) => ReactNode` defaulting to `<Inbox.Item/>`.
cost: additive.
verified: confirmed
```

```
id: api-12
file: AssistantThread/AssistantThread.tsx:300-345
severity: consider
claim: Tool calls always render as a collapsible JSON step. AI UIs commonly render a tool result as a custom card (generative UI); there is no hook to do that.
fix: `renderTool?: (part: ToolPart) => React.ReactNode | undefined` (undefined falls back to the built-in step); export `AssistantThread.Step` for reuse.
cost: additive.
verified: confirmed (no such prop; measured prop list has 6 props)
```

## Theming contract, ready to implement (api-5)

Rules for every row:
- Props go in `defaultProps` so `theme.components.X.defaultProps` can set them.
- Variables resolve in `createVarsResolver<XFactory>`. Set `X.varsResolver = varsResolver`, add `vars: XCssVariables` to the Factory, export `XCssVariables`, and add `varsResolver: true` to the test.
- CSS reads `var(--x-name, <current value>)`, so an undefined var keeps today's look.
- Colours go through `theme.variantColorResolver({ color, theme, variant, autoContrast })`, as NavLink does.

| Component | New props (default) | CSS variables (selector: root) | CSS fallback = today | New stylesNames | Forward `unstyled` to |
| --- | --- | --- | --- | --- | --- |
| Message | `avatarSize` (36) | `--message-avatar-size` = getSize(avatarSize, 'avatar-size') | rem(36px) in grid-template-columns | none | Avatar (Message.Avatar uses ctx avatarSize, so they cannot drift); Message.Avatar also accepts `radius` (default 'md') |
| ChatThread | `radius` ('lg'), `color` (primary), `autoContrast`, `avatarSize` ('sm') | `--chat-thread-radius` = getRadius; `--chat-thread-own-bg`, `--chat-thread-own-color` from variantColorResolver(filled), set only when `color` is passed; `--chat-thread-avatar-size` = getSize(avatarSize, 'avatar-size'); `--chat-thread-row-max-width` (vars only) | radius-lg; primary-color-filled / -contrast; rem(26px); 80% | none (forwarding is the gap) | MessageActions, Attachments, Reactions, Avatar, MessageList (already) |
| TeamThread | `avatarSize` (36), forwarded to Message | none of its own | none | `threadAvatars`, `threadCount`, `threadLastReply` (TeamThread.tsx:233-249); move `c="var(--mantine-color-anchor)"` and the other `c=`/`fw=` on styled Text into CSS (styles-api-9) | Message (already), MessageActions, Attachments, Reactions, Avatar.Group |
| Composer | `size` ('sm'), `radius` ('xl'), `leftSection`, `rightSection` | `--composer-radius` = getRadius(radius) | radius-xl | `replyLabel`, `replyAuthor`, `replyBody`, `cancelReply`, `section` | SegmentedControl (size xs->size, radius), Textarea (size), ActionIcon (`size={\`input-${size}\`}`, radius), CloseButton |
| Inbox | `color` (primary), `variant` ('light'), `autoContrast`, `radius` ('md') | `--inbox-radius`; `--inbox-active-bg`, `--inbox-active-color`, `--inbox-active-hover` from variantColorResolver(variant) | radius-md; primary-color-light; text | none | TextInput (radius), Avatar, Badge (color), EmptyState |
| MessageActions | `size` ('sm'), `radius` ('xl'), `variant` ('subtle'), `color` ('gray') passed to ActionIcon; no vars | none | none | `menu` (Menu.Dropdown via classNames), `menuItem` | ActionIcon, Menu |
| Reactions | `radius` ('xl'), `color` (primary) | `--reactions-radius`; `--reactions-active-bg` / `--reactions-active-color` (variant light), `--reactions-active-border` (filled bg) | radius-xl; primary-color-light; primary-color-filled | `emoji`, `count` | UnstyledButton |
| Attachments | `radius` ('md') | `--attachments-radius`; `--attachments-image-max-width`, `--attachments-file-max-width` (vars only) | radius-md; rem(240px); rem(280px) | `fileIcon`, `fileName`, `fileSize` (not `size`, which would read as the size prop) | Image, UnstyledButton |
| AssistantThread | `radius` ('xl', prompt bubble) | `--assistant-thread-prompt-radius`; `--assistant-thread-max-width`, `--assistant-thread-prompt-max-width` (vars only) | radius-xl; 48rem; 85% | `stepLabel`, `stepChevron` (move the `& > svg` rules here), `stepBadge` (replaces ms="auto" with margin-inline-start), `stepCaption`, `editorInput`, `editorActions`, `retry` | MessageActions, Alert, Badge, Button, Textarea, Code, MarkdownBody |
| MarkdownBody | none | none | none | `codeLanguage` (MarkdownBody.tsx:116) | Anchor, Code, ActionIcon, Typography |
| MessagesShell | none new | rename to `--messages-shell-radius`; add `--messages-shell-list-width`, `--messages-shell-aside-width` (vars only) | as today; rem(300px); rem(280px) | none | Button (AsideToggle) |
| ThreadPanel | none | none | none | none | Title, CloseButton, the replies list (already) |
| MessageList | none | none | none | none | Loader, Divider |

## Breaking renames, all in one release

| Old | New | Finding |
| --- | --- | --- |
| `controlRef`, `MessageListControl` | `handlersRef`, `MessageListHandlers` | api-1 |
| ThreadPanel `labels.title`, `ThreadPanelLabels extends TeamThreadLabels` | `title` prop; `labels: { close }`; thread labels move to `ThreadPanel.Replies` | api-2, parity-1 |
| ThreadPanel thread pass-through props (14) | `ThreadPanel.Replies` props | parity-1 |
| `ComposerDraft.attachments` | removed (until a pill row exists) | api-3 |
| `--shell-radius` | `--messages-shell-radius` | api-4 |
| `mantine-messages/markdown`, `mantine-messages/assistant`; MarkdownBody `components`, `remarkPlugins` | root entry; `createReactMarkdownAdapter(Markdown, { remarkPlugins, components })` | parity-3 |
| Reactions `onToggle` (consider) | `onToggleReaction` | api-8 |
| MessageActions `onThread` (consider) | `onOpenThread` | api-9 |
| Inbox `search`/`defaultSearch` (consider) | `searchValue`/`defaultSearchValue` | api-10 |

The package is unpublished (0.0.0), so no deprecated aliases are needed.

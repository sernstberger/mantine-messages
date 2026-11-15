# Changelog

All notable changes to mantine-messages. The package is not published yet; the first release
will be 0.1.0 (`npm run release:minor` from 0.0.0), when "Unreleased" becomes "0.1.0" with the date.

## Unreleased

### Added

Components

- `Inbox`: conversation list with previews, times, unread counts, muted state and selection, a
  search box (`withSearch`), sections (`sections`) and a `#` on channels
- `ChatThread`: chat bubbles grouped by author and time, date dividers, read status, scrolling
  that keeps the newest message in view, replies shown above the bubble with a jump to the
  original, a reply button through `onReply`, actions, reactions, attachments, a "New messages"
  line, loading older messages, and `renderBody` (for example to render markdown with
  `MarkdownBody`)
- `Composer`: text box that grows, Enter to send, a reply bar with cancel, `modes` with
  `draft.mode` and note styling for a mode with `note: true`, `streaming` and `onStop` (the send
  button becomes a stop button), `leftSection` and `rightSection`, `inputRef`, `textareaProps` and
  `readOnly`; `onSend` gets a draft `{ text, format, mode, replyToId }`
- `TeamThread`: Slack-style rows with compact follow-ups, event rows, internal notes, "(edited)",
  thread summaries that call `onOpenThread`, a hover toolbar and `renderBody`
- `ThreadPanel`: a thread beside the channel, a frame with `ThreadPanel.Replies` and
  `ThreadPanel.Footer`, `title`, `subtitle`, `titleOrder`, `withCloseButton`, `closeButtonProps`
  and focus management (`withFocusManagement`)
- `Message`, `Message.Avatar`, `Message.Body`, `Message.Meta`: building blocks for message rows
- `MessageList` and `useMessageList`: the engine for any message layout; follows the newest item
  while it grows; `handlersRef` gets `{ jumpTo }`, passed on by `ChatThread`, `TeamThread` and
  `AssistantThread`
- `MessageActions`, `Reactions`, `Attachments`
- `MessagesShell`: list, main and aside panes side by side as labelled regions; below
  `asideBreakpoint` the aside collapses behind `MessagesShell.AsideToggle` and opens over the main
  pane (`asideOpened`, `onAsideOpenedChange`)
- `MarkdownBody`: safe markdown with code blocks and copy buttons, rendered through a markdown
  adapter (`MarkdownAdapterProvider`, `createReactMarkdownAdapter`, `plainTextMarkdownAdapter`,
  `useMarkdownAdapter`), like `@mantine/code-highlight`; without a provider it shows plain text
- `AssistantThread` for LLM chat: streamed answers with markdown, collapsible reasoning and tool
  steps, regenerate, edit and resend, and finished answers announced to screen readers;
  `getAssistantText`
- Helpers: `getPreview`, `stripMarkdown`, `truncate`. Types: `MessageBase`, `ChatMessage`,
  `SystemEvent`, `Conversation`, `MessagesUser`, `AssistantMessage`, `AssistantPart`

Long threads

- Windowing for threads of thousands of messages, opt-in and engine-agnostic, as Mantine's
  Combobox, Tree and Table virtualization: `MessageList` gives a `rowsComponent` the flat row model
  (items, date dividers and the unread line, keyed by id, `MessageListRowData`), the viewport ref
  and a `handlersRef` for `scrollToIndex`; each row renders with `MessageList.Row`, which takes
  `style` and `ref` for a virtualizer such as `@tanstack/react-virtual`. `ChatThread`, `TeamThread`
  and `AssistantThread` pass `rowsComponent` through. With a window, the list still opens at the
  newest message and follows it, keeps the message in view in place when older ones load (by id),
  and `jumpTo` scrolls to a message that is not rendered, then focuses and flashes it. At 10,000
  messages: open in 58 ms instead of 1.7 s (Chromium), 321 DOM nodes instead of 114,000, 17 MB
  heap instead of 239 MB, a new message in 9 ms instead of 191 ms. Types `MessageListRowsProps`,
  `MessageListRowsHandlers`, `MessageListRowProps`, `MessageListRowFactory`, `MessageListRowData`,
  `MessageListItemRow`, `MessageListDividerRow`, `MessageListUnreadRow`

Dates and time zones

- `MessagesProvider` with `settings` `{ locale, timeZone, now }`, `useMessagesContext` and
  `MESSAGES_PROVIDER_DEFAULT_SETTINGS`, like `@mantine/dates`' `DatesProvider`: one place for the
  locale, the IANA time zone and the moment relative times count from, so a server render and the
  browser show the same times. Types: `MessagesProviderProps`, `MessagesProviderSettings`,
  `MessagesProviderValue`
- `timeZone` on `ChatThread`, `TeamThread`, `ThreadPanel.Replies`, `Inbox` and `MessageList`; it
  sets the times shown and where date dividers start a new day. Props win over the provider

Custom rows

- `ChatThread.renderMessage` and the parts `ChatThread.Message`, `.Avatar`, `.Quote`, `.Bubble`,
  `.Actions`, `.Attachments`, `.Reactions` and `.Meta`; `TeamThread.renderMessage` and the parts
  `TeamThread.Message`, `.Author`, `.Text`, `.Attachments`, `.Reactions`, `.ThreadSummary`,
  `.Actions` and `.Event`. The parts are styled by the thread's Styles API, and the default row is
  built from them

Theming

- `radius`, `color`, `autoContrast`, `size`, `variant` and `avatarSize` where they apply
  (`ChatThread`, `TeamThread`, `Message`, `Inbox`, `Composer`, `Reactions`, `Attachments`,
  `MessageActions`, `MessagesShell`, `AssistantThread`), CSS variables named
  `--<component>-<name>` set through `varsResolver` (so `vars` and `Component.extend` work), and
  `unstyled` forwarded to every Mantine component inside
- New selectors for the Styles API: the `Composer` reply bar, `Reactions` and `Attachments` parts,
  `MessageActions` menu, `TeamThread` thread summary, `AssistantThread` steps, and others; the
  Styles API tab of each component lists them with their variables

Public surface

- `mantine-messages` exports every component, part, hook, adapter API and type: each `XProps`,
  `XFactory`, `XStylesNames`, `XCssVariables` and `XLabels`, the part types such as
  `ChatThreadBubbleProps`, `ThreadPanelRepliesProps` and `ThreadPanelFooterProps`, the contexts
  `ChatThreadMessageContext` and `TeamThreadMessageContext`, `MessageListHandlers` and
  `MessageListJumpOptions`
- Type namespaces, as in Mantine's own components: `ChatThread.Props`, `.StylesNames`, `.Factory`,
  `.CssVariables`, `.Labels` and `ChatThread.Bubble.Props`, `ChatThread.Bubble.StylesNames` and so on
  for every component and part
- A build check that the entry reaches no package other than its peers (`npm run check:peers`,
  part of `npm test`)
- Release readiness: a `files` allowlist, types bundled per entry for ESM and CJS (checked with
  `npm run check:exports`), no empty source maps, peers narrowed to Mantine ^9.8.0 and React
  ^19.2.0, and `docgen.json` documents every component and part
- Docs: Theming, Compound components, Markdown adapter, Labels and Keyboard sections, a work queue
  example (table and email-client layouts on `MessagesShell`), and Storybook stories

### Changed (breaking)

The package is not published, so these ship without aliases.

- `ThreadPanel` is a frame with parts, like Mantine's `Modal`: the panel keeps `title` (a prop
  now, "Thread" by default; it was `labels.title`), `subtitle`, `titleOrder`, `onClose`,
  `withCloseButton`, `closeButtonProps`, `withFocusManagement` and `labels.close`;
  `ThreadPanel.Replies` takes `parent`, `replies` and every other `TeamThread` prop (it used to
  pass 14 of them through the panel, and thread labels are now its `labels`); `ThreadPanel.Footer`
  wraps the composer (a bare child is no longer wrapped). The panel is named by its title through
  `aria-labelledby`, and `unstyled` reaches its `Title`, `Text`, `CloseButton` and the thread
- Markdown goes through an adapter. `mantine-messages` no longer imports or peers on
  `react-markdown` and `remark-gfm`: install them yourself, create an adapter with
  `createReactMarkdownAdapter(Markdown, { remarkPlugins: [remarkGfm] })` and wrap your app in
  `MarkdownAdapterProvider`. `MarkdownBody` no longer takes `components` and `remarkPlugins`; pass
  them to `createReactMarkdownAdapter`, and `remark-gfm` is no longer added for you. `MarkdownBody`
  takes `adapter`, to use another adapter than the provider's for one instance
- `mantine-messages/markdown` and `mantine-messages/assistant` are gone, and with them
  `typesVersions` and the optional peers. Import `MarkdownBody`, `AssistantThread` and
  `getAssistantText` from `mantine-messages`
- Renames: `controlRef` is now `handlersRef` (like Mantine's `NumberInput`) on `MessageList`,
  `ChatThread`, `TeamThread`, `ThreadPanel` and `AssistantThread`, and its type
  `MessageListControl` is now `MessageListHandlers`; `Reactions` `onToggle` is now
  `onToggleReaction`; `MessageActions` `onThread` is now `onOpenThread`; `Inbox` `search` and
  `defaultSearch` are now `searchValue` and `defaultSearchValue`, like Mantine's `Select`;
  `Inbox` `emptyLabel` is now `labels.empty`; `MessageList` `labels.unread` is now
  `labels.newMessages`, the key `ChatThread`, `TeamThread` and `ThreadPanel` already use
- `MessageActions`: `labels.more` is a function of `{ author, own }` ("More actions for Maya's
  message", "More actions for your message"), and the toolbar is named by `labels.toolbar`; new
  props `author` and `own`, which `ChatThread` and `TeamThread` pass. Type: `MessageActionsOwner`
- `MessageActions` is a `role="toolbar"` with one tab stop (roving tabindex: arrow keys, Home and
  End, mirrored under `dir="rtl"`) instead of a tab stop per button
- `Composer`: a draft has no `attachments`; use `leftSection` and `rightSection`
- `MessagesShell`: the CSS variable `--shell-radius` is now `--messages-shell-radius`
- `MessageList` is built with Mantine's `genericFactory`, so `<MessageList<T>>` is typed without a
  cast and `MessageListFactory` carries the generic `signature`; `MessageListBase` is no longer
  exported (use `MessageList`)
- `locale` is `'en'` by default (from `MessagesProvider`) instead of the runtime's locale, as in
  `@mantine/dates`, so the server and the browser agree; set it on the provider or per component
- `ChatThread`, `TeamThread`: the copy action copies the message's whole `body` (markdown
  included) instead of its plain-text preview
- `ThreadPanel`: the title is a heading (`Title`), `h2` by default

### Fixed

Accessibility

- `MessageList`: the log is named (`labels.log`, "Messages", or `aria-label`), is `aria-busy`
  while older items load and in the update that prepends them, so screen readers do not read old
  history out as new, and the history loader is a labelled progressbar (`labels.loadingOlder`);
  `ChatThread` and `TeamThread` take both labels. `jumpTo` moves keyboard focus to the item it
  scrolls to; `jumpTo(id, { focus: false })` keeps focus where it is
- `ChatThread`: every message tells screen readers who wrote it (`labels.you`, "You", for your
  own; the name where none is shown) and when (`<time datetime>`); "Sending" and "Not sent" show
  under every own message that has them, not only the last
- `TeamThread`: follow-up rows give screen readers the author's name, event rows their time, and
  times are `<time datetime>` elements
- `Composer`: focus stays in the text box after sending with the send button; the reply bar
  describes the text box (`aria-describedby`), and an `aria-describedby` in `textareaProps` now
  reaches the text box instead of being replaced by Mantine's input wrapper
- `AssistantThread`: after editing a prompt, Escape or Cancel returns focus to its Edit button and
  sending focuses the prompt; the editor's caret starts at the end of the text. Screen readers
  hear `labels.thinking` once when an answer starts, the streaming answer is `aria-busy`, and the
  Thinking indicator is an image with a name
- `Inbox`: an unread badge is read as `labels.unread(count)` ("3 unread"), muted conversations
  say `labels.muted`, and while the search filters the list a polite status region says
  `labels.results(count)` (or `labels.noResults`) once typing pauses
- `ThreadPanel`: focus moves to the title when the panel opens from a focused control and back to
  that control when it closes; the focused title shows the theme's focus ring around its text.
  Escape still does not close it, by design
- `MessagesShell`: Escape on the `AsideToggle` or the open aside closes the collapsed aside

Layout and styling

- `MessageList` stays at the bottom when its size changes without a render, for example while the
  `Composer` below grows a line or an image loads; a long thread no longer opens a few pixels short
  of the newest message
- `Attachments`: images load lazily, so a long history no longer fetches every image at once;
  `MessageAttachment` takes optional `width` and `height`, which reserve an image's box
- `MessageList`, `TeamThread`: `unstyled` reaches the scroll area, so the module class no longer
  stays on its root
- Every component passes Mantine's `attributes` prop to its Styles API, so
  `attributes={{ root: {...}, item: {...} }}` reaches the root and inner parts instead of leaking
  onto the root element
- Right-to-left layouts: `TeamThread`'s hover toolbar and internal-note bar, the `Composer` reply
  bar and field, `MarkdownBody` code headers, thread summaries, `MessagesShell` pane borders and
  overlay aside, and the `AssistantThread` tool badge use logical sides, so they mirror under
  `dir="rtl"`
- Sizes in the CSS modules use `rem()`, so spacing follows the root font size and `theme.scale`
  (same pixels at the default 16px root); 1px borders and focus outlines stay in px
- `Inbox`, `TeamThread`: row hover uses the theme's `--mantine-color-default-hover` (in dark mode
  this is `dark-5`, a step lighter than before); `AssistantThread` step headers use `@mixin hover`,
  so the hover background no longer sticks after a tap on touch screens

Performance

- `MarkdownBody` parses its text block by block and keeps each parsed block while its text is
  unchanged, so a streamed answer no longer re-parses the whole answer on every token (a 4.5 kB
  answer streamed in 909 tokens parsed 2.07M characters, now 42k). With an adapter that sets
  `splitBlocks: false`, or link reference and footnote definitions in the text, the text is still
  parsed whole. Custom renderers get `node` positions relative to their block.
  `npm run check:markdown` checks the blocks against react-markdown
- `AssistantThread`: answers and prompts are memoized, and inline `onRegenerate`, `onEdit` and
  `labels` no longer break the memo, so a token renders only the streaming answer
- `MessageList`: items are memoised, so a render of the list renders only new and changed items
  when `renderItem` is stable (`useCallback`); `jumpTo` is stable across renders
- `ChatThread`, `TeamThread`: rows are memoised and handlers are read through a ref, so a render
  of the thread (a keystroke in a parent, an inline `onReply`) renders only new and changed rows;
  a change to `renderBody`, `actions`, `labels`, `users` or the Styles API props renders them all
- `Inbox`: rows are memoized and sections are filled in one pass, so typing in the search box no
  longer renders every row
- `MessageActions` mounts its overflow `Menu` on first use and `useClipboard` only with a copy
  action; `preview` may be a function, called only when a button shows
- Times, dates, relative times and file sizes reuse one `Intl` formatter per locale and options
  instead of building one per call

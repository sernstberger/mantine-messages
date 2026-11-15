# Changelog

All notable changes to mantine-messages. The package is not published yet; the first release
will be 0.1.0.

## Unreleased

### Added

- `Inbox`: conversation list with previews, times, unread counts, muted state and selection
- `ChatThread`: chat bubbles grouped by author and time, date dividers, read status, scrolling
  that keeps the newest message in view, replies shown above the bubble with a jump to the
  original, and a reply button through `onReply`
- `Composer`: text box that grows, Enter to send, a reply bar with cancel; `onSend` gets a draft
  `{ text, format, attachments, replyToId }`
- Types: `MessageBase`, `ChatMessage`, `SystemEvent`, `Conversation`, `MessagesUser`
- Helpers: `getPreview`, `stripMarkdown`, `truncate`
- `MessageList` and `useMessageList`: the engine for any message layout
- `MessageActions`, `Reactions`, `Attachments`
- `ChatThread`: actions, reactions, attachments, a "New messages" line, loading older messages
- `TeamThread`: Slack-style rows with compact follow-ups, event rows, internal notes, "(edited)",
  thread summaries that call `onOpenThread`, and a hover toolbar
- `ThreadPanel`: a thread beside the channel, with a slot for a `Composer`
- `Message`, `Message.Avatar`, `Message.Body`, `Message.Meta`: building blocks for message rows
- `Composer`: `modes` with `draft.mode`, and note styling for a mode with `note: true`
- `Inbox`: a search box (`withSearch`), sections (`sections`), and a `#` on channels
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
- `MessageList`: `controlRef` gets `{ jumpTo }`, so code outside the list can scroll to an item
  and flash it; `ChatThread`, `TeamThread` and `AssistantThread` pass it on. Type:
  `MessageListControl`
- `ThreadPanel`: `withCloseButton` and `closeButtonProps`, like Mantine's `Modal`; `hasOlder`,
  `loadingOlder`, `onLoadOlder`, `controlRef`, `groupWindow` and `autoScroll` pass to the thread
- `Composer`: `inputRef`, `textareaProps` and `readOnly`, as on Mantine's inputs
- Types: `MessageAvatarFactory`, `MessageBodyFactory`, `MessageMetaFactory`, for theme overrides
  and `extend` on `Message.Avatar`, `Message.Body` and `Message.Meta`
- `MessagesShell`: list, main and aside panes side by side as labelled regions; below
  `asideBreakpoint` the aside collapses behind `MessagesShell.AsideToggle` and opens over the main
  pane (`asideOpened`, `onAsideOpenedChange`)
- Work queue example in the docs and Storybook: a triage table (sort, filter, search, bulk
  assign, close and tag), one timeline per ticket mixing emails, chat, internal notes and events,
  Reply and Internal note from one composer, and assign, status, priority and snooze
- Work queue split view in the docs and Storybook, on `MessagesShell`: email-client ticket rows
  with previews and unread state, the conversation, and the ticket details beside it (collapsed
  behind a Details button below 960px); shares its state with the table layout
- Release readiness: a `files` allowlist, types bundled per entry for ESM and CJS (checked with `npm run check:exports`), no empty source maps, peers narrowed to Mantine ^9.8.0 and React ^19.2.0, and `docgen.json` documents `Message`, its parts and `MessagesShell`

### Changed

- `Inbox`: `emptyLabel` is now `labels.empty`, next to `labels.noResults`, so all of its text is
  in `labels`
- `MessageList`: `labels.unread` is now `labels.newMessages`, the key `ChatThread`, `TeamThread`
  and `ThreadPanel` already use
- `MessageList` is built with Mantine's `genericFactory`, so `<MessageList<T>>` is typed without a
  cast and `MessageListFactory` carries the generic `signature`; `MessageListBase` is no longer
  exported (use `MessageList`)
- `ThreadPanel`: the title is a heading (`Title`), `h2` by default; `titleOrder` sets the level
- `Inbox`, `TeamThread`: row hover uses the theme's `--mantine-color-default-hover` (in dark mode
  this is `dark-5`, a step lighter than before); `AssistantThread` step headers use
  `@mixin hover`, so the hover background no longer sticks after a tap on touch screens
- Right-to-left layouts: `TeamThread`'s hover toolbar and internal-note bar, the `Composer` reply
  bar and field, `MarkdownBody` code headers, thread summaries, `MessagesShell` pane borders and
  overlay aside, and the `AssistantThread` tool badge use logical sides, so they mirror under
  `dir="rtl"`
- Sizes in the CSS modules use `rem()`, so spacing follows the root font size and
  `theme.scale` (same pixels at the default 16px root); 1px borders and focus outlines stay in px

### Fixed

- `MarkdownBody` parses its text block by block and keeps each parsed block while its text is
  unchanged, so a streamed answer no longer re-parses the whole answer on every token (a 4.5 kB
  answer streamed in 909 tokens parsed 2.07M characters, now 42k), and a re-render with the same
  text, `components` and `remarkPlugins` parses nothing. With `remarkPlugins`, or link reference
  and footnote definitions in the text, the text is still parsed whole. Custom renderers get
  `node` positions relative to their block. `npm run check:markdown` checks the blocks against
  react-markdown
- `AssistantThread`: answers and prompts are memoized, and inline `onRegenerate`, `onEdit` and
  `labels` no longer break the memo, so a token renders only the streaming answer instead of
  re-running `getAssistantText` and `stripMarkdown` for every answer in the thread
- `AssistantThread`: after editing a prompt, Escape or Cancel returns focus to its Edit button and
  sending focuses the prompt (it was lost to the page)
- `AssistantThread`: screen readers hear `labels.thinking` once when an answer starts (the status
  region was silent until the answer finished), the streaming answer is `aria-busy`, and the
  Thinking indicator is an image with a name (its label sat on an element without a role)
- `Inbox`: rows are memoized and sections are filled in one pass, so typing in the search box no
  longer renders every row or scans the sections once per conversation per section
- `Inbox`: an unread badge is read as `labels.unread(count)` ("3 unread") instead of a bare
  number, muted conversations say `labels.muted`, and while the search filters the list a polite
  status region says `labels.results(count)` (or `labels.noResults`) once typing pauses. New
  labels: `unread`, `muted`, `results`
- `ThreadPanel`: focus moves to the title when the panel opens from a focused control and back to
  that control when it closes (keyboard users were left on the opener and lost focus on close).
  New prop `withFocusManagement`, `true` by default. Escape still does not close it, by design
- Every component passes Mantine's `attributes` prop to its Styles API, so
  `attributes={{ root: {...}, item: {...} }}` reaches the root and inner parts instead of leaking
  onto the root element

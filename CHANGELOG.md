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

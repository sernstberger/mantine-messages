# mantine-messages feature set: design

Date: 2026-11-15. Status: approved in chat, pending review of this written spec.

## Goal

A Mantine 9 extension that is flexible enough for many messaging scenarios: chat bubbles,
Slack-style team chat, LLM chat, and a work queue (triage of customer conversations that mix
email, chat and internal notes). It must clear the Mantine community-list bar: complete, polished,
visibly maintained. The package is a UI kit only: the app brings data; nothing is fetched, sent
or stored.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Packaging | One npm package with subpath entries, not separate packages | One release, docs site and listing for a solo maintainer; subpaths keep optional peers out of the root entry |
| First release (0.1) | Core + `ChatThread` + `TeamThread` + `/markdown` + `/assistant` | Five half-done scenarios read as abandoned; these share the most |
| Work queue | A full example app in the docs and Storybook, not a component | It is mostly app logic (table, filters, assignment) built from package parts |
| Email | Shown inside the work queue as cards; the full message opens in mantine-doc-viewer through a new email renderer | An email is a document; sandboxed HTML rendering belongs in one place |
| Full email client (MailThread, Tiptap, To/Cc) | Not planned; only on demand | Heaviest dependencies, smallest audience, permanent security burden |
| Data model | Small base type plus one type per scenario; components generic over the item type | One universal `Message` becomes a junk drawer of optional fields |
| Flexibility | Generic `MessageList` with `renderItem`, plus `Message.*` building-block parts, plus the Styles API | Scenarios become recipes instead of new props |
| Message bodies | `format: 'text' \| 'markdown'`; markdown renderer from `mantine-messages/markdown`; `renderBody` replaces it | No optional peer is ever imported from the root entry |
| Composer | Textarea composer; `onSend(draft)` takes an object; `modes` such as Reply and Note | A string cannot carry format, attachments or who can see the message |
| Message actions | `actions` prop: built-in names plus custom items, in a hover toolbar with a Mantine `Menu` for overflow | Every scenario wants a different set |

Reviewed by two independent agents (a library maintainer and a messaging-API designer) before
approval; both recommended a narrower first release, one package with subpath entries, and
per-scenario types.

## Package layout

```
mantine-messages                  core + chat; peers: @mantine/core, @mantine/hooks, react only
  useMessageList                  stick-to-bottom, jump-to + flash, unread line, onLoadOlder
  MessageList<T>                  renderItem per item; date dividers; role="log"
  Message.Root / Avatar / Body / Meta / Actions
  Quote, Reactions, Attachments   (reactions and attachments display; emoji picker passed in)
  ChatThread                      bubbles (today's Thread, renamed)
  TeamThread, ThreadPanel         Slack-style flat rows; a thread beside the channel
  Inbox                           conversation list with search and sections
  Composer                        autosize textarea, reply bar, modes, onSend(draft)
mantine-messages/markdown         MarkdownBody; react-markdown (+ remark-gfm) as optional peers
mantine-messages/assistant        AssistantThread: parts, streaming, stop / regenerate / edit, tool steps
```

Rules:

- The root entry never imports an optional peer, not even lazily (`import()` of a missing package
  fails the app's build in webpack and Vite). A build test checks the root bundle for it.
- Every component uses `factory()`, `useProps`, the Styles API and `data-*` modifiers; state rules
  that must beat light/dark or hover backgrounds use `[data-x]`, not `:where()`.
- Mantine components and hooks wherever they fit (ScrollArea, Divider, Text, EmptyState,
  CloseButton, Menu, ActionIcon, useUncontrolled, useReducedMotion, useTimeout).

## Types

```ts
interface MessageBase { id: string; authorId: string; createdAt: MessageDate }

interface ChatMessage extends MessageBase {
  body: string;
  format?: 'text' | 'markdown';
  preview?: string;                  // plain text for inbox previews and labels; derived when missing
  replyToId?: string;
  threadId?: string;
  thread?: { count: number; lastReplyAt: MessageDate; participantIds: string[] };
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  editedAt?: MessageDate;
  status?: MessageStatus;
  visibility?: 'public' | 'internal'; // internal notes in the work queue
}

interface SystemEvent extends MessageBase { kind: 'event'; text: string }

type AssistantPart =
  | { type: 'text'; text: string; state?: 'streaming' | 'done' }
  | { type: 'reasoning'; text: string; state?: 'streaming' | 'done' }
  | { type: 'tool'; name: string; input: unknown; output?: unknown; state: 'running' | 'done' | 'error' };

interface AssistantMessage extends MessageBase {
  role: 'user' | 'assistant';
  parts: AssistantPart[];
  status?: 'streaming' | 'done' | 'error';
}

interface ComposerDraft {
  text: string;
  format: 'text' | 'markdown';
  attachments: File[];
  mode?: string;                      // for example 'reply' or 'note'
  replyToId?: string;
}
```

`Conversation` keeps today's fields (title, avatar, participants, lastMessage, unreadCount,
muted, pinned) and gains `kind?: 'direct' | 'group' | 'channel'`. Work-queue fields (status,
priority, assignee, SLA) live in the example app's own types, not in the package.

Streaming: the app updates the last part of an `AssistantMessage` as tokens arrive. Finished
parts are memoized so only the streaming part re-renders.

## Scenarios

| Scenario | Built from | Must do |
|---|---|---|
| Chat | `ChatThread`, `Inbox`, `Composer` | Everything built so far: grouping, dividers, read status, stick-to-bottom, replies with a faded quote above the bubble |
| Team chat | `TeamThread`, `ThreadPanel`, `Inbox` sections | Flat rows (avatar, name, time; compact follow-ups), "12 replies" link opening the thread beside the channel, reactions, event rows |
| LLM chat | `AssistantThread`, `Composer` | Streaming answer with markdown and code, Stop, Regenerate, edit and resend a prompt, collapsible tool and reasoning steps, `aria-live` that announces finished answers |
| Work queue (example) | Mantine `Table` (or mantine-datatable in the example only), `MessageList` with `renderItem`, `Composer` with Reply and Note modes, DocViewer | Triage list (status, priority, assignee, age/SLA; sort, filter, search, bulk assign/close/tag); one timeline mixing emails, chat, internal notes and events; reply or internal note from one composer; assign, change status and priority, snooze |

## Build order

Each phase ends with `npm test` green at 100% coverage, a Storybook story checked in the
browser, and a commit.

| Phase | Builds | Done when |
|---|---|---|
| 0. Breaking fixes | Rename `Thread` to `ChatThread`; `onSend(draft)`; split the types; `preview` used for labels and inbox; CHANGELOG | Old names are gone; stories and docs updated |
| 1. Engine | `useMessageList`, generic `MessageList`, `onLoadOlder` keeping the view steady, `Message.*` parts, actions toolbar and Menu, reactions and attachments display | ChatThread rebuilt on it with no behaviour lost |
| 2. Team chat | `TeamThread`, `ThreadPanel`, event rows, Composer modes, internal-note styling | A Slack-style story that looks like a real product |
| 3. Markdown and LLM | `/markdown`, `/assistant` | A streaming story driven by a fake token stream; the root-bundle peer check passes |
| 4. Work queue example | Triage table, mixed timeline, reply and note, assign, status, snooze; emails as cards | Example in the docs and Storybook; emails open in DocViewer once phase 5 lands |
| 5. Email renderer | In mantine-doc-viewer: headers, HTML in a sandboxed iframe, remote images blocked until allowed | Done in that repo, after its lane branches are merged |

Phases 2 and 3 depend only on phase 1 and can run in parallel.

Release: 0.1 after phase 3; a couple of minor releases over a few weeks; then the one-line
listing PR to mantinedev/mantine. Also before listing: issue templates, a public roadmap, and a
docs demo that looks like a real app.

## Out of scope for 0.x

- Full email client: MailThread, RichComposer on @mantine/tiptap, To/Cc/Subject fields
- Virtualization for very long threads (document a tested ceiling instead; revisit on demand)
- Sending, fetching, storage, presence or typing indicators from a backend

## Open questions

- Publish mantine-doc-viewer first, or explicitly freeze it, so only one package is in progress
  at a time (the maintainer reviewer's advice). Phase 5 depends on the doc viewer either way.

# mantine-messages

Messaging components for [Mantine](https://mantine.dev), for people talking to people: an
`Inbox` of conversations, a `ChatThread` of messages and a `Composer` to write them, with the
Mantine Styles API, light and dark themes, and keyboard and screen reader support.

## Install

```bash
yarn add mantine-messages @mantine/core @mantine/hooks react react-dom
```

Peers: `@mantine/core` and `@mantine/hooks` ^9.8.0, `react` and `react-dom` ^19.2.0. Optional peers, only for
`mantine-messages/markdown` and `mantine-messages/assistant`: `react-markdown` ^10 and `remark-gfm` ^4.

```bash
yarn add react-markdown remark-gfm
```

## Components

| Component | What it does |
| --- | --- |
| `Inbox` | Conversation list: avatar, last message preview, time, unread count, muted state, selection |
| `ChatThread` | Messages grouped by author and time, date dividers, your messages on the right, status of your last message |
| `Composer` | Text box that grows, Enter to send, Shift+Enter for a new line |
| `TeamThread` | Slack-style rows: compact follow-ups, event lines, internal notes, "12 replies" thread summaries, reactions and files |
| `ThreadPanel` | A thread beside the channel: the parent, a reply count, the replies and your composer |
| `Message` | The parts of a row (`Message.Avatar`, `Message.Body`, `Message.Meta`) for your own layouts |
| `MarkdownBody` | From `mantine-messages/markdown`: safe markdown with Mantine typography, code blocks and copy buttons |
| `AssistantThread` | From `mantine-messages/assistant`: LLM chat with streamed answers, reasoning and tool steps, Stop, Regenerate, edit and resend |

Markdown and the assistant need two optional peers: `yarn add react-markdown remark-gfm`. The root
entry never imports them.

All three share the `Conversation`, `ChatMessage` and `MessagesUser` types. You bring the data; the
components never fetch anything.

## Usage

Import the styles once, after Mantine's: `mantine-messages/styles.css`, or
`mantine-messages/styles.layer.css` if your app uses CSS layers.

```tsx
import '@mantine/core/styles.css';
import 'mantine-messages/styles.css';
import { Composer, Inbox, ChatThread } from 'mantine-messages';

function Messenger() {
  return (
    <>
      <Inbox conversations={conversations} value={openId} onChange={setOpenId} />
      <ChatThread messages={messages} users={users} currentUserId="me" />
      <Composer onSend={(draft) => sendMessage(draft.text)} />
    </>
  );
}
```

Markdown (needs the optional peers):

```tsx
import { MarkdownBody } from 'mantine-messages/markdown';

<MarkdownBody>{'Some **markdown** with `code`'}</MarkdownBody>;
```

Assistant chat (needs the optional peers):

```tsx
import { Composer } from 'mantine-messages';
import { AssistantThread } from 'mantine-messages/assistant';

<>
  <AssistantThread messages={messages} onRegenerate={regenerate} />
  <Composer onSend={(draft) => ask(draft.text)} streaming={streaming} onStop={stop} />
</>;
```

See the [documentation](https://sernstberger.github.io/mantine-messages/) for every prop.

## Development

- `nvm use` then `yarn`: install dependencies
- `npm run storybook`: Storybook on port 8281
- `npm run dev`: documentation site on port 9291
- `npm run build`: build the package into `package/dist` (the docs typecheck needs it)
- `npm test`: syncpack, format, typecheck, lint, and Jest with 100% coverage required

## License

MIT

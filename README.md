# mantine-messages

Messaging components for [Mantine](https://mantine.dev), for people talking to people: an
`Inbox` of conversations, a `ChatThread` of messages and a `Composer` to write them, with the
Mantine Styles API, light and dark themes, and keyboard and screen reader support.

**Status:** early, not published yet.

## Components

| Component | What it does |
| --- | --- |
| `Inbox` | Conversation list: avatar, last message preview, time, unread count, muted state, selection |
| `ChatThread` | Messages grouped by author and time, date dividers, your messages on the right, status of your last message |
| `Composer` | Text box that grows, Enter to send, Shift+Enter for a new line |

All three share the `Conversation`, `Message` and `MessagesUser` types. You bring the data; the
components never fetch anything.

## Usage

```tsx
import '@mantine/core/styles.css';
import 'mantine-messages/styles.css';
import { Composer, Inbox, ChatThread } from 'mantine-messages';

function Messenger() {
  return (
    <>
      <Inbox conversations={conversations} value={openId} onChange={setOpenId} />
      <ChatThread messages={messages} users={users} currentUserId="me" />
      <Composer onSend={(text) => sendMessage(text)} />
    </>
  );
}
```

## Development

This repo was created from [mantinedev/extension-template](https://github.com/mantinedev/extension-template).

- `nvm use` then `yarn`: install dependencies
- `npm run storybook`: Storybook on port 8281
- `npm run dev`: documentation site on port 9291
- `npm run build`: build the package into `package/dist` (the docs typecheck needs it)
- `npm test`: syncpack, format, typecheck, lint, and Jest with 100% coverage required

## License

MIT

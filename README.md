# mantine-messages

Messaging components for [Mantine](https://mantine.dev), for people talking to people: an
`Inbox` of conversations, a `ChatThread` of messages and a `Composer` to write them, with the
Mantine Styles API, light and dark themes, and keyboard and screen reader support.

## Install

```bash
yarn add mantine-messages @mantine/core @mantine/hooks react react-dom
```

Peers: `@mantine/core` and `@mantine/hooks` ^9.8.0, `react` and `react-dom` ^19.2.0.

Markdown (`MarkdownBody`, and the answers of `AssistantThread`) needs a markdown engine that you
install and hand over through an adapter, like `@mantine/code-highlight` does for highlighters.
Without one the text shows as plain text:

```bash
yarn add react-markdown remark-gfm
```

```tsx
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createReactMarkdownAdapter, MarkdownAdapterProvider } from 'mantine-messages';

const adapter = createReactMarkdownAdapter(Markdown, { remarkPlugins: [remarkGfm] });

<MarkdownAdapterProvider adapter={adapter}>{/* your app */}</MarkdownAdapterProvider>;
```

## Components

- `Inbox`: conversation list with avatar, preview, time, unread count, muted state, search and selection
- `ChatThread`: messages grouped by author and time, date dividers, your messages on the right, status of your last message
- `TeamThread`: Slack-style rows with compact follow-ups, event lines, internal notes, "12 replies" summaries, reactions and files
- `ThreadPanel`: a thread beside the channel with the parent, a reply count, the replies and your composer
- `Composer`: text box that grows, Enter to send, Shift+Enter for a new line, reply bar and modes
- `MessageList` (and `useMessageList`): the scrolling list the threads are built on, with windowing for long threads
- `Message`: the parts of a row (`Message.Avatar`, `Message.Body`, `Message.Meta`) for your own layouts
- `MessagesShell`: the layout that holds an inbox, a thread and a side panel
- `AssistantThread`: LLM chat with streamed answers, reasoning and tool steps, Stop, Regenerate, edit and resend
- `MarkdownBody`: safe markdown through your adapter with Mantine typography, code blocks and copy buttons
- `Reactions`, `Attachments` and `MessageActions`: the reaction bar, the file list and the hover actions of a message
- `MessagesProvider`: shared settings such as `timeZone` and `now`

All of them share the `Conversation`, `ChatMessage` and `MessagesUser` types. You bring the data;
the components never fetch anything.

## Usage

Render the components inside `MantineProvider`. Import the styles once, after Mantine's:
`mantine-messages/styles.css`, or `mantine-messages/styles.layer.css` if your app uses CSS layers.

```tsx
import '@mantine/core/styles.css';
import 'mantine-messages/styles.css';
import { MantineProvider } from '@mantine/core';
import { ChatThread, Composer, Inbox } from 'mantine-messages';

function Messenger() {
  return (
    <MantineProvider>
      <Inbox conversations={conversations} value={openId} onChange={setOpenId} />
      <ChatThread messages={messages} users={users} currentUserId="me" />
      <Composer onSend={(draft) => sendMessage(draft.text)} />
    </MantineProvider>
  );
}
```

Markdown (needs the adapter above):

```tsx
import { MarkdownBody } from 'mantine-messages';

<MarkdownBody>{'Some **markdown** with `code`'}</MarkdownBody>;
```

Assistant chat (answers show markdown with the adapter above):

```tsx
import { AssistantThread, Composer } from 'mantine-messages';

<>
  <AssistantThread messages={messages} onRegenerate={regenerate} />
  <Composer onSend={(draft) => ask(draft.text)} streaming={streaming} onStop={stop} />
</>;
```

See the [documentation](https://sernstberger.github.io/mantine-messages/) for every prop, the
live examples, `MessagesProvider` and windowing for long threads.

## Development

- `nvm use` then `yarn`: install dependencies
- `npm run storybook`: Storybook on port 8281
- `npm run dev`: documentation site on port 9291
- `npm run build`: build the package into `package/dist` (the docs typecheck needs it)
- `npm test`: syncpack, format, typecheck, lint, and Jest with 100% coverage required

## License

MIT

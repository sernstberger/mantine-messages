import type {
  AttachmentsFactory,
  ChatThreadFactory,
  ComposerFactory,
  InboxFactory,
  MessageActionsFactory,
  MessageFactory,
  MessageListFactory,
  MessagesShellFactory,
  ReactionsFactory,
  TeamThreadFactory,
  ThreadPanelFactory,
} from 'mantine-messages';
import type { AssistantThreadFactory } from 'mantine-messages/assistant';
import type { MarkdownBodyFactory } from 'mantine-messages/markdown';
import type { StylesApiData } from '../components/styles-api.types';

export const InboxStylesApi: StylesApiData<InboxFactory> = {
  selectors: {
    root: 'Root element',
    search: 'Search box, with `withSearch`',
    section: 'One section: a heading and its conversations',
    sectionLabel: 'Heading of a section',
    item: 'Button for one conversation',
    avatar: 'Conversation avatar; a # for channels',
    body: 'Grid holding the title, time, preview and unread count',
    title: 'Conversation title',
    time: 'Time of the last message',
    preview: 'Text of the last message',
    unread: 'Unread count badge',
    empty: 'Shown when there are no conversations or the search matches none',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-active', selector: 'item', condition: 'The conversation is open' },
    { modifier: 'data-unread', selector: 'item', condition: '`unreadCount` is above 0' },
    { modifier: 'data-muted', selector: 'item', condition: '`muted` is set on the conversation' },
    { modifier: 'data-channel', selector: 'item', condition: '`kind` is `channel`' },
  ],
};

export const ChatThreadStylesApi: StylesApiData<ChatThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of messages, a live log',
    divider: 'Date divider',
    unread: '"New messages" line',
    loader: 'Loader at the top while older messages load',
    item: 'Wrapper of one message, scrolled to by jumps',
    row: 'One message: avatar column and content',
    avatar: 'Avatar on the last message of a group',
    avatarSpace: 'Space under the avatar for other messages of a group',
    content: 'Author, quote, bubble, files, reactions and time',
    author: 'Name on the first message of a group',
    quoteLabel: 'Caption above a reply, for example "You replied to Maya"',
    quote: 'Faded copy of the answered message; a click scrolls to it',
    line: 'Bubble and its actions',
    bubble: 'One message',
    actions: 'MessageActions beside the bubble, shown on hover and focus',
    reactions: 'Reactions under the bubble',
    attachments: 'Attachments under the bubble',
    meta: 'Time under the last message of a group',
    status: 'Status of your last message',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-own', selector: ['row', 'bubble'], condition: 'Written by `currentUserId`' },
    { modifier: 'data-group-start', selector: 'row', condition: 'First message of a group' },
    {
      modifier: 'data-status',
      selector: ['bubble', 'status'],
      condition: 'The message has a `status`: sending, sent, delivered, read or failed',
    },
    {
      modifier: 'data-highlighted',
      selector: 'bubble',
      condition: 'For 1.6 seconds after a click on a quote of this message',
    },
    {
      modifier: 'data-unavailable',
      selector: 'quote',
      condition: 'The answered message is not in `messages`',
    },
  ],
};

export const MessageListStylesApi: StylesApiData<MessageListFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of items, a live log',
    divider: 'Date divider',
    unread: '"New messages" line',
    loader: 'Loader floating at the top while older items load',
    item: 'Wrapper of one item, scrolled to by jumps',
  },
  vars: {},
};

export const MessageActionsStylesApi: StylesApiData<MessageActionsFactory> = {
  selectors: { root: 'Root element', action: 'One action button, or the More button' },
  vars: {},
  modifiers: [{ modifier: 'data-menu-open', selector: 'root', condition: 'The More menu is open' }],
};

export const ReactionsStylesApi: StylesApiData<ReactionsFactory> = {
  selectors: { root: 'Root element', reaction: 'One emoji and its count' },
  vars: {},
  modifiers: [
    {
      modifier: 'data-active',
      selector: 'reaction',
      condition: 'The current user reacted with it',
    },
  ],
};

export const AttachmentsStylesApi: StylesApiData<AttachmentsFactory> = {
  selectors: {
    root: 'Root element',
    image: 'Image thumbnail',
    file: 'File chip with name and size',
  },
  vars: {},
};

export const ComposerStylesApi: StylesApiData<ComposerFactory> = {
  selectors: {
    root: 'Root element',
    modes: 'SegmentedControl that picks the mode, with `modes`',
    reply: 'Bar above the text box while replying, with a cancel button',
    replyText: 'Who and what the reply answers',
    field: 'Row with the text box and the send button',
    input: 'Textarea that grows with its text',
    send: 'Send button',
  },
  vars: {},
  modifiers: [
    {
      modifier: 'data-streaming',
      selector: 'send',
      condition: '`streaming` is set: the button stops the answer',
    },
    { modifier: 'data-mode', selector: 'root', condition: '`value` of the chosen mode' },
    { modifier: 'data-note', selector: 'root', condition: 'The chosen mode has `note: true`' },
  ],
};

export const MessageStylesApi: StylesApiData<MessageFactory> = {
  selectors: {
    root: 'Root element: an avatar column and a content column',
    avatar: '`Message.Avatar`',
    body: '`Message.Body`, the content column',
    meta: '`Message.Meta`: name and time, or a time in the avatar column shown on hover',
  },
  vars: {},
  modifiers: [{ modifier: 'data-compact', selector: 'root', condition: '`compact` is set' }],
};

export const TeamThreadStylesApi: StylesApiData<TeamThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of rows, a live log',
    divider: 'Date divider',
    unread: '"New messages" line',
    loader: 'Loader at the top while older messages load',
    item: 'Wrapper of one row, scrolled to by jumps',
    row: 'One message, a `Message`',
    avatar: 'Avatar on the first message of a group',
    gutterTime: 'Time beside a follow-up message, shown on hover',
    body: 'Name, text, files, reactions and thread summary',
    meta: 'Name and time on the first message of a group',
    author: 'Name of the author',
    time: 'Time of the message',
    noteLabel: '"Internal note" above an internal note',
    text: 'Text of the message',
    edited: '"(edited)" after an edited message',
    actions: 'MessageActions toolbar, shown on hover and focus',
    attachments: 'Attachments under the text',
    reactions: 'Reactions under the text',
    threadSummary: '"12 replies" with who answered and when; opens the thread',
    repliesDivider: 'Divider with the reply count after the parent, with `threadParentId`',
    event: 'A system event, such as "Maya joined"',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-compact', selector: 'row', condition: 'A follow-up message of a group' },
    { modifier: 'data-internal', selector: 'row', condition: '`visibility` is `internal`' },
    { modifier: 'data-selected', selector: 'row', condition: 'The message is `selectedId`' },
    {
      modifier: 'data-highlighted',
      selector: 'row',
      condition: 'For 1.6 seconds after a jump to the message',
    },
  ],
};

export const ThreadPanelStylesApi: StylesApiData<ThreadPanelFactory> = {
  selectors: {
    root: 'Root element, a complementary region named by the title',
    header: 'Title, subtitle and close button',
    heading: 'Title and subtitle',
    title: 'Title, "Thread" by default',
    subtitle: 'Subtitle, for example the channel',
    close: 'Close button, with `onClose`',
    thread: 'The TeamThread: parent, replies divider and replies',
    composer: 'Wrapper of `children`, usually a Composer',
  },
  vars: {},
};

export const MessagesShellStylesApi: StylesApiData<MessagesShellFactory> = {
  selectors: {
    root: 'Root element: the panes side by side',
    list: '`MessagesShell.List`, a region, 300px wide by default',
    main: '`MessagesShell.Main`, a region that takes the rest of the width',
    aside: '`MessagesShell.Aside`, a complementary region, 280px wide by default',
    asideBackdrop: 'Behind the collapsed aside while it is open; a click closes the aside',
    asideToggle: '`MessagesShell.AsideToggle`, shown while the aside is collapsed',
  },
  vars: {
    root: { '--shell-radius': 'Corner radius, from `radius`' },
  },
  modifiers: [
    { modifier: 'data-with-border', selector: 'root', condition: '`withBorder` is set' },
    {
      modifier: 'data-aside-collapsed',
      selector: 'root',
      condition: 'The shell is narrower than `asideBreakpoint`',
    },
    {
      modifier: 'data-overlay',
      selector: 'aside',
      condition: 'The aside is collapsed and open, over `Main`',
    },
  ],
};

export const MarkdownBodyStylesApi: StylesApiData<MarkdownBodyFactory> = {
  selectors: {
    root: 'Root element, a Mantine Typography',
    link: 'Link; opens in a new tab',
    code: 'Inline code',
    codeBlock: 'Fenced code block: header and code',
    codeHeader: 'Language and copy button above a code block',
    copy: 'Copy button of a code block',
    pre: 'Code of a code block',
  },
  vars: {},
};

export const AssistantThreadStylesApi: StylesApiData<AssistantThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of prompts and answers, a log that does not read tokens aloud',
    item: 'Wrapper of one prompt or answer',
    turn: 'One prompt or answer, in a centred column',
    bubble: 'Text of a prompt',
    answer: 'Parts of an answer, in order',
    text: 'One text part, rendered with MarkdownBody',
    thinking: 'Dots shown before the first part of an answer arrives',
    step: 'Reasoning or tool step',
    stepHeader: 'Button that opens a step: name and state',
    stepBody: 'Reasoning text, or a tool’s input and output',
    stepCode: 'Input or output of a tool, as JSON',
    error: 'Alert under a failed answer, with Retry',
    actions: 'Copy, Regenerate and Edit',
    editor: 'Text box and buttons while a prompt is edited',
  },
  vars: {},
  modifiers: [
    {
      modifier: 'data-role',
      selector: 'turn',
      condition: '`user` for prompts, `assistant` for answers',
    },
    {
      modifier: 'data-status',
      selector: 'turn',
      condition: 'The answer has a `status`: streaming, done or error',
    },
    {
      modifier: 'data-streaming',
      selector: 'text',
      condition: 'The part is streaming: a cursor blinks at its end',
    },
    { modifier: 'data-expanded', selector: 'stepHeader', condition: 'The step is open' },
  ],
};

export const STYLES_API_DATA = {
  Inbox: InboxStylesApi,
  ChatThread: ChatThreadStylesApi,
  Composer: ComposerStylesApi,
  MessageList: MessageListStylesApi,
  MessageActions: MessageActionsStylesApi,
  Reactions: ReactionsStylesApi,
  Attachments: AttachmentsStylesApi,
  Message: MessageStylesApi,
  TeamThread: TeamThreadStylesApi,
  ThreadPanel: ThreadPanelStylesApi,
  MessagesShell: MessagesShellStylesApi,
  MarkdownBody: MarkdownBodyStylesApi,
  AssistantThread: AssistantThreadStylesApi,
};

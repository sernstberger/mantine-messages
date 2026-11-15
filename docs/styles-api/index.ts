import type {
  AttachmentsFactory,
  ChatThreadFactory,
  ComposerFactory,
  InboxFactory,
  MessageActionsFactory,
  MessageListFactory,
  ReactionsFactory,
} from 'mantine-messages';
import type { StylesApiData } from '../components/styles-api.types';

export const InboxStylesApi: StylesApiData<InboxFactory> = {
  selectors: {
    root: 'Root element',
    item: 'Button for one conversation',
    avatar: 'Conversation avatar',
    body: 'Grid holding the title, time, preview and unread count',
    title: 'Conversation title',
    time: 'Time of the last message',
    preview: 'Text of the last message',
    unread: 'Unread count badge',
    empty: 'Shown when there are no conversations',
  },
  vars: {},
  modifiers: [
    { modifier: 'data-active', selector: 'item', condition: 'The conversation is open' },
    { modifier: 'data-unread', selector: 'item', condition: '`unreadCount` is above 0' },
    { modifier: 'data-muted', selector: 'item', condition: '`muted` is set on the conversation' },
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
    reply: 'Bar above the text box while replying, with a cancel button',
    replyText: 'Who and what the reply answers',
    field: 'Row with the text box and the send button',
    input: 'Textarea that grows with its text',
    send: 'Send button',
  },
  vars: {},
};

export const STYLES_API_DATA = {
  Inbox: InboxStylesApi,
  ChatThread: ChatThreadStylesApi,
  Composer: ComposerStylesApi,
  MessageList: MessageListStylesApi,
  MessageActions: MessageActionsStylesApi,
  Reactions: ReactionsStylesApi,
  Attachments: AttachmentsStylesApi,
};

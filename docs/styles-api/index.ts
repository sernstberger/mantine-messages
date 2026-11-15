import type { ComposerFactory, InboxFactory, ChatThreadFactory } from 'mantine-messages';
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

export const ThreadStylesApi: StylesApiData<ChatThreadFactory> = {
  selectors: {
    root: 'Root element, a Mantine ScrollArea',
    list: 'Column of messages inside the scroll area, a live log',
    divider: 'Date divider between days, a Mantine Divider',
    group: 'Consecutive messages from one author',
    avatar: 'Avatar of another person',
    messages: 'Column of bubbles inside a group',
    author: 'Name of another person',
    row: 'One message and its reply button',
    content: 'Column with the bubble and, for a reply, what it answers',
    bubble: 'One message',
    quoteLabel: 'Caption above a reply, for example "You replied to Maya"',
    quote: 'Faded copy of the answered message; a click scrolls to it',
    replyButton: 'Reply button, shown on hover and focus when `onReply` is set',
    meta: 'Time under a group',
    status: 'Status of your last message',
  },
  vars: {},
  modifiers: [
    {
      modifier: 'data-own',
      selector: ['group', 'bubble'],
      condition: 'Written by `currentUserId`',
    },
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
  ChatThread: ThreadStylesApi,
  Composer: ComposerStylesApi,
};

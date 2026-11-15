import type { ComposerFactory, InboxFactory, ThreadFactory } from 'mantine-messages';
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

export const ThreadStylesApi: StylesApiData<ThreadFactory> = {
  selectors: {
    root: 'Root element, a live log',
    divider: 'Date divider between days',
    group: 'Consecutive messages from one author',
    avatar: 'Avatar of another person',
    messages: 'Column of bubbles inside a group',
    author: 'Name of another person',
    bubble: 'One message',
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
  ],
};

export const ComposerStylesApi: StylesApiData<ComposerFactory> = {
  selectors: {
    root: 'Root element',
    input: 'Textarea that grows with its text',
    send: 'Send button',
  },
  vars: {},
};

export const STYLES_API_DATA = {
  Inbox: InboxStylesApi,
  Thread: ThreadStylesApi,
  Composer: ComposerStylesApi,
};

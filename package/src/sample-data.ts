import type { Conversation, ChatMessage, MessagesUser, SystemEvent } from './types';

const now = new Date();
const at = (daysAgo: number, hours: number, minutes: number) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hours, minutes);
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

export const sampleUsers: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
  { id: 'priya', name: 'Priya Raman' },
  { id: 'sam', name: 'Sam Whitaker' },
];

export const sampleMessages: ChatMessage[] = [
  {
    id: 'm1',
    authorId: 'maya',
    body: 'Did the venue confirm for Saturday?',
    createdAt: at(1, 17, 2),
  },
  {
    id: 'm2',
    authorId: 'me',
    body: 'Yes! 40 seats, and they can do the long table by the window.',
    createdAt: at(1, 17, 10),
    status: 'read',
  },
  { id: 'm3', authorId: 'maya', body: 'Perfect', createdAt: at(1, 17, 11) },
  {
    id: 'm4',
    authorId: 'maya',
    body: 'Can you send me the deposit invoice when you get a chance? Finance wants it before Friday.',
    createdAt: at(1, 17, 12),
    reactions: [{ emoji: '👍', userIds: ['me'] }],
  },
  {
    id: 'm5',
    authorId: 'maya',
    body: 'Morning! Any luck with that invoice?',
    createdAt: minutesAgo(40),
  },
  {
    id: 'm6',
    authorId: 'me',
    body: 'Sorry, totally slipped my mind.',
    replyToId: 'm4',
    createdAt: minutesAgo(12),
    status: 'read',
  },
  {
    id: 'm7',
    authorId: 'me',
    body: 'Sending it over now. It also has the menu options they suggested.',
    createdAt: minutesAgo(11),
    status: 'delivered',
    attachments: [
      {
        id: 'a1',
        name: 'deposit-invoice.pdf',
        url: '#',
        mimeType: 'application/pdf',
        size: 184320,
      },
    ],
  },
];

export const sampleConversations: Conversation[] = [
  {
    id: 'maya',
    title: 'Maya Lindqvist',
    lastMessage: sampleMessages[sampleMessages.length - 1],
  },
  {
    id: 'offsite',
    title: 'Offsite planning',
    unreadCount: 3,
    lastMessage: {
      authorId: 'theo',
      body: 'Theo: I booked the train for everyone',
      createdAt: minutesAgo(55),
    },
  },
  {
    id: 'priya',
    title: 'Priya Raman',
    unreadCount: 1,
    lastMessage: { authorId: 'priya', body: 'Are we still on for lunch?', createdAt: at(1, 12, 5) },
  },
  {
    id: 'design',
    title: 'Design crit',
    muted: true,
    unreadCount: 14,
    lastMessage: {
      authorId: 'sam',
      body: 'Sam: new mocks are up in the file',
      createdAt: at(3, 15, 20),
    },
  },
  {
    id: 'sam',
    title: 'Sam Whitaker',
    lastMessage: { authorId: 'me', body: 'Thanks, have a good weekend!', createdAt: at(12, 18, 0) },
  },
];

export const sampleChannels: Conversation[] = [
  {
    id: 'launch',
    title: 'launch',
    kind: 'channel',
    pinned: true,
    unreadCount: 2,
    lastMessage: { authorId: 'priya', body: 'Screenshots are up 🎉', createdAt: minutesAgo(12) },
  },
  {
    id: 'general',
    title: 'general',
    kind: 'channel',
    lastMessage: { authorId: 'sam', body: 'Lunch is on the roof today', createdAt: minutesAgo(80) },
  },
  {
    id: 'design',
    title: 'design',
    kind: 'channel',
    muted: true,
    unreadCount: 5,
    lastMessage: { authorId: 'sam', body: 'New icons are in the file', createdAt: at(1, 16, 40) },
  },
  {
    id: 'random',
    title: 'random',
    kind: 'channel',
    lastMessage: {
      authorId: 'theo',
      body: 'Who borrowed the HDMI adapter?',
      createdAt: at(2, 11, 5),
    },
  },
  {
    id: 'dm-maya',
    title: 'Maya Lindqvist',
    kind: 'direct',
    unreadCount: 1,
    lastMessage: {
      authorId: 'maya',
      body: 'Got a minute after standup?',
      createdAt: minutesAgo(25),
    },
  },
  {
    id: 'dm-theo',
    title: 'Theo Okafor',
    kind: 'direct',
    lastMessage: { authorId: 'me', body: 'Thanks!', createdAt: at(1, 18, 2) },
  },
  {
    id: 'dm-crew',
    title: 'Priya Raman, Sam Whitaker',
    kind: 'group',
    lastMessage: { authorId: 'priya', body: 'Booked the room', createdAt: at(3, 9, 30) },
  },
];

export const sampleTeamItems: (ChatMessage | SystemEvent)[] = [
  {
    id: 'team-e1',
    kind: 'event',
    authorId: 'priya',
    text: 'Priya Raman joined #launch',
    createdAt: at(1, 9, 0),
  },
  {
    id: 'team-m1',
    authorId: 'maya',
    body: 'Launch checklist is in the pinned doc. Can everyone claim their items by end of day?',
    createdAt: at(1, 9, 30),
    reactions: [{ emoji: '👀', userIds: ['theo', 'priya'] }],
    thread: { count: 3, lastReplyAt: minutesAgo(120), participantIds: ['theo', 'priya', 'me'] },
  },
  {
    id: 'team-r1',
    authorId: 'theo',
    threadId: 'team-m1',
    body: "I'll take the release notes and the changelog.",
    createdAt: at(1, 9, 41),
  },
  {
    id: 'team-r2',
    authorId: 'priya',
    threadId: 'team-m1',
    body: 'Docs screenshots are mine.',
    createdAt: at(1, 10, 2),
  },
  {
    id: 'team-r3',
    authorId: 'me',
    threadId: 'team-m1',
    body: 'Taking the pricing page copy.',
    createdAt: minutesAgo(120),
  },
  {
    id: 'team-m2',
    authorId: 'maya',
    body: 'Also: code freeze is Thursday at noon.',
    createdAt: at(1, 9, 31),
  },
  {
    id: 'team-m3',
    authorId: 'theo',
    body: 'Staging build 412 is green. Smoke tests pass on all three browsers.',
    createdAt: minutesAgo(95),
    attachments: [
      {
        id: 'team-f1',
        name: 'smoke-report.pdf',
        url: '#',
        mimeType: 'application/pdf',
        size: 92160,
      },
    ],
  },
  {
    id: 'team-m4',
    authorId: 'theo',
    body: 'Only flaky one was the upload test; a rerun passed.',
    createdAt: minutesAgo(94),
    editedAt: minutesAgo(90),
  },
  {
    id: 'team-m5',
    authorId: 'sam',
    visibility: 'internal',
    body: 'Heads up: the payment provider rotates keys tonight. No deploys between 22:00 and 23:00.',
    createdAt: minutesAgo(40),
  },
  {
    id: 'team-m6',
    authorId: 'priya',
    body: 'Screenshots are up 🎉',
    createdAt: minutesAgo(12),
    reactions: [{ emoji: '🎉', userIds: ['maya', 'me'] }],
  },
];

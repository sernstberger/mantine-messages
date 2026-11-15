import type { Conversation, Message, MessagesUser } from './types';

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

export const sampleMessages: Message[] = [
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
    createdAt: minutesAgo(12),
    status: 'read',
  },
  {
    id: 'm7',
    authorId: 'me',
    body: 'Sending it over now. It also has the menu options they suggested.',
    createdAt: minutesAgo(11),
    status: 'delivered',
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

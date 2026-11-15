import type { ChatMessage, MessageDate } from '../types';

export interface MessageGroup {
  type: 'group';

  /** `id` of the first message, stable while messages are appended */
  key: string;
  authorId: string;
  messages: ChatMessage[];
}

export interface DateDivider {
  type: 'divider';
  key: string;

  /** Midnight, local time, of the day that follows */
  date: Date;
}

export type ThreadItem = MessageGroup | DateDivider;

export const toDate = (value: MessageDate) => (value instanceof Date ? value : new Date(value));

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Splits messages, oldest first, into date dividers and groups of consecutive messages from
 * one author. A gap longer than `groupWindow` milliseconds starts a new group.
 */
export function groupMessages(messages: ChatMessage[], groupWindow = 5 * 60 * 1000): ThreadItem[] {
  const items: ThreadItem[] = [];
  let group: MessageGroup | null = null;
  let lastDay = -1;
  let lastTime = 0;

  for (const message of messages) {
    const date = toDate(message.createdAt);
    const day = startOfDay(date);

    if (day.getTime() !== lastDay) {
      items.push({ type: 'divider', key: `divider-${message.id}`, date: day });
      lastDay = day.getTime();
      group = null;
    }

    if (!group || group.authorId !== message.authorId || date.getTime() - lastTime > groupWindow) {
      group = { type: 'group', key: message.id, authorId: message.authorId, messages: [] };
      items.push(group);
    }

    group.messages.push(message);
    lastTime = date.getTime();
  }

  return items;
}

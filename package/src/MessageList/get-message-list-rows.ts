import type { MessageBase, MessageDate } from '../types';
import { dayKey } from '../utils/dates';

/** An item of the list, with its neighbours and group flags */
export interface MessageListItemRow<T extends MessageBase = MessageBase> {
  type: 'item';

  /** The item's `id` */
  key: string;
  item: T;

  /** Position of the item in `items` */
  index: number;
  previous?: T;
  next?: T;
  groupStart: boolean;
  groupEnd: boolean;
}

/** The date divider before the first item of a day */
export interface MessageListDividerRow {
  type: 'divider';

  /** `day:` and the day, so it stays the same when older items are prepended */
  key: string;

  /** `createdAt` of the first item of the day */
  date: MessageDate;
}

/** The "New messages" line after the last read item */
export interface MessageListUnreadRow {
  type: 'unread';
  key: 'unread';
}

/** One row of a message list: an item, a date divider or the unread line, keyed by `key` */
export type MessageListRowData<T extends MessageBase = MessageBase> =
  | MessageListItemRow<T>
  | MessageListDividerRow
  | MessageListUnreadRow;

export interface GetMessageListRowsOptions<T extends MessageBase> {
  groupWith?: (previous: T, item: T) => boolean;
  withDateDividers: boolean;
  unreadAfterId?: string | null;
}

export function getMessageListRows<T extends MessageBase>(
  items: T[],
  { groupWith, withDateDividers, unreadAfterId }: GetMessageListRowsOptions<T>
): MessageListRowData<T>[] {
  const rows: MessageListRowData<T>[] = [];
  const newDay = (a: T | undefined, b: T) =>
    withDateDividers && (!a || dayKey(a.createdAt) !== dayKey(b.createdAt));

  items.forEach((item, index) => {
    const previous = items[index - 1];
    const next = items[index + 1];
    const dayStarts = newDay(previous, item);

    if (dayStarts) {
      rows.push({ type: 'divider', key: `day:${dayKey(item.createdAt)}`, date: item.createdAt });
    }

    rows.push({
      type: 'item',
      key: item.id,
      item,
      index,
      previous,
      next,
      groupStart: !previous || dayStarts || !groupWith?.(previous, item),
      groupEnd: !next || newDay(item, next) || !groupWith?.(item, next),
    });

    if (item.id === unreadAfterId && next) {
      rows.push({ type: 'unread', key: 'unread' });
    }
  });

  return rows;
}

import type { MessageBase, MessageDate } from '../types';
import { dayNumber } from '../utils/format';

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
  timeZone?: string;
}

export function getMessageListRows<T extends MessageBase>(
  items: T[],
  { groupWith, withDateDividers, unreadAfterId, timeZone }: GetMessageListRowsOptions<T>
): MessageListRowData<T>[] {
  const rows: MessageListRowData<T>[] = [];
  // Each item's day is computed once; the divider, groupStart and groupEnd all compare these
  const days = withDateDividers ? items.map((item) => dayNumber(item.createdAt, timeZone)) : [];
  const newDay = (index: number) =>
    withDateDividers && (index === 0 || days[index - 1] !== days[index]);

  items.forEach((item, index) => {
    const previous = items[index - 1];
    const next = items[index + 1];
    const dayStarts = newDay(index);

    if (dayStarts) {
      rows.push({
        type: 'divider',
        key: `day:${days[index]}`,
        date: item.createdAt,
      });
    }

    rows.push({
      type: 'item',
      key: item.id,
      item,
      index,
      previous,
      next,
      groupStart: !previous || dayStarts || !groupWith?.(previous, item),
      groupEnd: !next || newDay(index + 1) || !groupWith?.(item, next),
    });

    if (item.id === unreadAfterId && next) {
      rows.push({ type: 'unread', key: 'unread' });
    }
  });

  return rows;
}

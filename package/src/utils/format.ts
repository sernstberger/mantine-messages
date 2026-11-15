import type { MessageDate } from '../types';
import { toDate } from './group-messages';

const DAY = 24 * 60 * 60 * 1000;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Time of day, for example "9:41 AM" */
export function formatTime(value: MessageDate, locale?: string) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    toDate(value)
  );
}

/** Label of a date divider: "Today", "Yesterday", a weekday in the last week, else a date */
export function formatDay(value: MessageDate, locale?: string, now = new Date()) {
  const date = toDate(value);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const yesterday = new Date(now.getTime() - DAY);

  if (sameDay(date, now)) {
    return capitalize(relative.format(0, 'day'));
  }

  if (sameDay(date, yesterday)) {
    return capitalize(relative.format(-1, 'day'));
  }

  if (now.getTime() - date.getTime() < 7 * DAY) {
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

/** Short time for an inbox row: a time today, a weekday this week, else a short date */
export function formatShort(value: MessageDate, locale?: string, now = new Date()) {
  const date = toDate(value);

  if (sameDay(date, now)) {
    return formatTime(date, locale);
  }

  if (now.getTime() - date.getTime() < 7 * DAY) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  }

  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

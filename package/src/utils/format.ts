import type { MessageDate } from '../types';
import { toDate } from './dates';

const DAY = 24 * 60 * 60 * 1000;

// Building an Intl formatter costs about 50 times more than using one, and a thread formats a
// time per message on every render, so each locale and option set gets one formatter
const formatters = new Map<
  string,
  Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.NumberFormat
>();

function cached<T extends Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.NumberFormat>(
  kind: string,
  locale: string | undefined,
  options: object,
  create: () => T
): T {
  const key = `${kind}|${locale ?? ''}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key) as T | undefined;

  if (!formatter) {
    formatter = create();
    formatters.set(key, formatter);
  }

  return formatter;
}

/** One shared `Intl.DateTimeFormat` per locale and options */
export function getDateTimeFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  return cached('date', locale, options, () => new Intl.DateTimeFormat(locale, options));
}

/** One shared `Intl.RelativeTimeFormat` per locale and options */
export function getRelativeTimeFormat(
  locale: string | undefined,
  options: Intl.RelativeTimeFormatOptions
) {
  return cached('relative', locale, options, () => new Intl.RelativeTimeFormat(locale, options));
}

/** One shared `Intl.NumberFormat` per locale and options */
export function getNumberFormat(locale: string | undefined, options: Intl.NumberFormatOptions) {
  return cached('number', locale, options, () => new Intl.NumberFormat(locale, options));
}

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const NUMERIC_AUTO: Intl.RelativeTimeFormatOptions = { numeric: 'auto' };

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Time of day, for example "9:41 AM" */
export function formatTime(value: MessageDate, locale?: string) {
  return getDateTimeFormat(locale, TIME).format(toDate(value));
}

/** Label of a date divider: "Today", "Yesterday", a weekday in the last week, else a date */
export function formatDay(value: MessageDate, locale?: string, now = new Date()) {
  const date = toDate(value);
  const relative = getRelativeTimeFormat(locale, NUMERIC_AUTO);
  const yesterday = new Date(now.getTime() - DAY);

  if (sameDay(date, now)) {
    return capitalize(relative.format(0, 'day'));
  }

  if (sameDay(date, yesterday)) {
    return capitalize(relative.format(-1, 'day'));
  }

  if (now.getTime() - date.getTime() < 7 * DAY) {
    return getDateTimeFormat(locale, { weekday: 'long' }).format(date);
  }

  return getDateTimeFormat(locale, {
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
    return getDateTimeFormat(locale, { weekday: 'short' }).format(date);
  }

  return getDateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** File size, for example "512 B", "1.5 KB", "5 MB" */
export function formatBytes(bytes: number, locale?: string) {
  const format = (value: number) =>
    getNumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

  if (bytes < 1024) {
    return `${format(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${format(bytes / 1024)} KB`;
  }

  return `${format(bytes / 1024 / 1024)} MB`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** Time from now in words: "now", "5 minutes ago", "2 hours ago", "yesterday" */
export function formatRelative(value: MessageDate, locale?: string, now = new Date()) {
  const seconds = Math.round((toDate(value).getTime() - now.getTime()) / 1000);
  const relative = getRelativeTimeFormat(locale, NUMERIC_AUTO);

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }

  return relative.format(0, 'second');
}

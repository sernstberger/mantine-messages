import type { MessageDate } from '../types';
import { toDate } from './dates';

const DAY = 24 * 60 * 60 * 1000;

// Building an Intl formatter costs about 50 times more than using one, so each one is shared;
// options carry the time zone, so the key covers locale, time zone and options
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

export function getDateTimeFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  return cached('date', locale, options, () => new Intl.DateTimeFormat(locale, options));
}

export function getRelativeTimeFormat(
  locale: string | undefined,
  options: Intl.RelativeTimeFormatOptions
) {
  return cached('relative', locale, options, () => new Intl.RelativeTimeFormat(locale, options));
}

export function getNumberFormat(locale: string | undefined, options: Intl.NumberFormatOptions) {
  return cached('number', locale, options, () => new Intl.NumberFormat(locale, options));
}

export interface DateSettings {
  locale?: string;
  timeZone?: string;
  now?: MessageDate;
}

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const NUMERIC_AUTO: Intl.RelativeTimeFormatOptions = { numeric: 'auto' };
const CALENDAR_DAY: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
};

// One formatter per time zone, so the hot path (a day number for every item) builds no cache key
const dayFormatters = new Map<string, Intl.DateTimeFormat>();

export function dayNumber(value: MessageDate, timeZone?: string) {
  const zone = timeZone ?? '';
  let format = dayFormatters.get(zone);

  if (!format) {
    format = getDateTimeFormat('en-US', { ...CALENDAR_DAY, timeZone });
    dayFormatters.set(zone, format);
  }

  let year = 0;
  let month = 0;
  let day = 0;

  for (const part of format.formatToParts(toDate(value))) {
    if (part.type === 'year') {
      year = Number(part.value);
    } else if (part.type === 'month') {
      month = Number(part.value);
    } else if (part.type === 'day') {
      day = Number(part.value);
    }
  }

  return Date.UTC(year, month - 1, day) / DAY;
}

const yearOf = (day: number) => new Date(day * DAY).getUTCFullYear();

function daysBefore(date: Date, { timeZone, now }: DateSettings) {
  const today = dayNumber(now ?? new Date(), timeZone);
  const day = dayNumber(date, timeZone);
  return { daysAgo: today - day, sameYear: yearOf(today) === yearOf(day) };
}

export function formatTime(value: MessageDate, { locale, timeZone }: DateSettings) {
  return getDateTimeFormat(locale, { ...TIME, timeZone }).format(toDate(value));
}

export function formatDay(value: MessageDate, settings: DateSettings) {
  const { locale, timeZone } = settings;
  const date = toDate(value);
  const { daysAgo, sameYear } = daysBefore(date, settings);

  if (daysAgo === 0 || daysAgo === 1) {
    return capitalize(getRelativeTimeFormat(locale, NUMERIC_AUTO).format(0 - daysAgo, 'day'));
  }

  if (daysAgo < 7) {
    return getDateTimeFormat(locale, { weekday: 'long', timeZone }).format(date);
  }

  return getDateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(date);
}

export function formatShort(value: MessageDate, settings: DateSettings) {
  const { locale, timeZone } = settings;
  const date = toDate(value);
  const { daysAgo } = daysBefore(date, settings);

  if (daysAgo === 0) {
    return formatTime(date, settings);
  }

  if (daysAgo < 7) {
    return getDateTimeFormat(locale, { weekday: 'short', timeZone }).format(date);
  }

  return getDateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone }).format(date);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

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

export function formatRelative(value: MessageDate, { locale, now }: DateSettings) {
  const from = now === undefined ? Date.now() : toDate(now).getTime();
  const seconds = Math.round((toDate(value).getTime() - from) / 1000);
  const relative = getRelativeTimeFormat(locale, NUMERIC_AUTO);

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }

  return relative.format(0, 'second');
}

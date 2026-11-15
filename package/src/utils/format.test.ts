import {
  dayNumber,
  formatBytes,
  formatDay,
  formatRelative,
  formatShort,
  formatTime,
  getDateTimeFormat,
  getNumberFormat,
  getRelativeTimeFormat,
} from './format';

const now = new Date(2026, 10, 15, 12, 0);

describe('formatTime', () => {
  it('formats the time of day for a locale', () => {
    expect(formatTime(new Date(2026, 10, 15, 9, 5), { locale: 'en-US' })).toBe('9:05 AM');
    expect(formatTime(new Date(2026, 10, 15, 21, 5), { locale: 'de-DE' })).toBe('21:05');
  });
});

describe('formatDay', () => {
  it('says Today and Yesterday', () => {
    expect(formatDay(new Date(2026, 10, 15, 8), { locale: 'en-US', now })).toBe('Today');
    expect(formatDay(new Date(2026, 10, 14, 8), { locale: 'en-US', now })).toBe('Yesterday');
  });

  it('gives a weekday within the last week', () => {
    expect(formatDay(new Date(2026, 10, 11, 8), { locale: 'en-US', now })).toBe('Wednesday');
  });

  it('gives a date, with the year only when it differs', () => {
    expect(formatDay(new Date(2026, 9, 1), { locale: 'en-US', now })).toBe('October 1');
    expect(formatDay(new Date(2025, 9, 1), { locale: 'en-US', now })).toBe('October 1, 2025');
  });

  it('uses the browser locale by default', () => {
    expect(formatDay(new Date(), {})).toBeTruthy();
  });
});

describe('formatShort', () => {
  it('gives a time today, a weekday this week, else a short date', () => {
    expect(formatShort(new Date(2026, 10, 15, 9, 5), { locale: 'en-US', now })).toBe('9:05 AM');
    expect(formatShort(new Date(2026, 10, 12, 9), { locale: 'en-US', now })).toBe('Thu');
    expect(formatShort(new Date(2026, 10, 3), { locale: 'en-US', now })).toBe('Nov 3');
  });

  it('uses the current time by default', () => {
    expect(formatShort(new Date(), {})).toBeTruthy();
  });
});

describe('formatBytes', () => {
  it('uses B, KB and MB', () => {
    expect(formatBytes(512, 'en-US')).toBe('512 B');
    expect(formatBytes(1536, 'en-US')).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024, 'en-US')).toBe('5 MB');
  });
});

describe('formatRelative', () => {
  const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);
  const MINUTE = 60 * 1000;

  it('says now, minutes, hours or days ago', () => {
    expect(formatRelative(ago(30 * 1000), { locale: 'en-US', now })).toBe('now');
    expect(formatRelative(ago(5 * MINUTE), { locale: 'en-US', now })).toBe('5 minutes ago');
    expect(formatRelative(ago(2 * 60 * MINUTE), { locale: 'en-US', now })).toBe('2 hours ago');
    expect(formatRelative(ago(24 * 60 * MINUTE), { locale: 'en-US', now })).toBe('yesterday');
    expect(formatRelative(ago(3 * 24 * 60 * MINUTE), { locale: 'en-US', now })).toBe('3 days ago');
  });

  it('measures from the current time by default', () => {
    expect(formatRelative(new Date(), { locale: 'en-US' })).toBe('now');
  });
});

describe('formatter cache', () => {
  it('builds one formatter per locale and options', () => {
    const built = jest.spyOn(Intl, 'DateTimeFormat');
    formatTime(new Date(2026, 10, 15, 9, 5), { locale: 'fr-CA' });
    formatTime(new Date(2026, 10, 15, 10, 5), { locale: 'fr-CA' });
    formatTime(new Date(2026, 10, 15, 11, 5), { locale: 'fr-CA' });
    expect(built).toHaveBeenCalledTimes(1);
    formatTime(new Date(2026, 10, 15, 11, 5), { locale: 'it-IT' });
    expect(built).toHaveBeenCalledTimes(2);
    built.mockRestore();
  });

  it('keeps formatters with different options apart', () => {
    expect(getDateTimeFormat('en-US', { weekday: 'long' })).toBe(
      getDateTimeFormat('en-US', { weekday: 'long' })
    );
    expect(getDateTimeFormat('en-US', { weekday: 'long' })).not.toBe(
      getDateTimeFormat('en-US', { weekday: 'short' })
    );
    expect(getRelativeTimeFormat(undefined, { numeric: 'auto' })).toBe(
      getRelativeTimeFormat(undefined, { numeric: 'auto' })
    );
    expect(getNumberFormat('de-DE', { maximumFractionDigits: 1 })).toBe(
      getNumberFormat('de-DE', { maximumFractionDigits: 1 })
    );
  });
});

describe('time zones', () => {
  const NEW_YORK = 'America/New_York';
  const TOKYO = 'Asia/Tokyo';
  const instant = Date.UTC(2026, 10, 15, 2, 30);
  const utcNoon = Date.UTC(2026, 10, 15, 12);

  it('formats the time in the given zone', () => {
    expect(formatTime(instant, { locale: 'en-US', timeZone: 'UTC' })).toBe('2:30 AM');
    expect(formatTime(instant, { locale: 'en-US', timeZone: NEW_YORK })).toBe('9:30 PM');
    expect(formatTime(instant, { locale: 'en-US', timeZone: TOKYO })).toBe('11:30 AM');
  });

  it('starts days at midnight in the given zone', () => {
    expect(dayNumber(instant, 'UTC')).toBe(dayNumber(utcNoon, 'UTC'));
    expect(dayNumber(instant, NEW_YORK)).toBe(dayNumber(utcNoon, NEW_YORK) - 1);
    expect(dayNumber(instant, TOKYO)).toBe(dayNumber(utcNoon, TOKYO));
    expect(dayNumber(Date.UTC(1970, 0, 2, 12), 'UTC')).toBe(1);
  });

  it('says Today or Yesterday by the calendar of the zone', () => {
    const settings = { locale: 'en-US', now: utcNoon };
    expect(formatDay(instant, { ...settings, timeZone: 'UTC' })).toBe('Today');
    expect(formatDay(instant, { ...settings, timeZone: NEW_YORK })).toBe('Yesterday');
    expect(formatDay(instant, { ...settings, timeZone: TOKYO })).toBe('Today');
  });

  it('gives weekdays and dates in the zone', () => {
    const later = Date.UTC(2026, 10, 20, 12);
    expect(formatDay(instant, { locale: 'en-US', timeZone: NEW_YORK, now: later })).toBe(
      'Saturday'
    );
    expect(formatDay(instant, { locale: 'en-US', timeZone: TOKYO, now: later })).toBe('Sunday');
    expect(formatShort(instant, { locale: 'en-US', timeZone: NEW_YORK, now: later })).toBe('Sat');

    const newYear = Date.UTC(2027, 0, 1, 2);
    const january = Date.UTC(2027, 0, 20);
    expect(formatDay(newYear, { locale: 'en-US', timeZone: NEW_YORK, now: january })).toBe(
      'December 31, 2026'
    );
    expect(formatDay(newYear, { locale: 'en-US', timeZone: TOKYO, now: january })).toBe(
      'January 1'
    );
    expect(formatShort(newYear, { locale: 'en-US', timeZone: NEW_YORK, now: january })).toBe(
      'Dec 31'
    );
  });

  it('gives the time for today in the zone', () => {
    expect(formatShort(instant, { locale: 'en-US', timeZone: TOKYO, now: utcNoon })).toBe(
      '11:30 AM'
    );
  });

  it('counts relative times from a fixed now', () => {
    expect(formatRelative(instant, { locale: 'en-US', now: instant + 3 * 60 * 1000 })).toBe(
      '3 minutes ago'
    );
    expect(formatRelative(instant, { locale: 'en-US', now: new Date(instant) })).toBe('now');
  });

  it('builds one formatter per locale, time zone and options', () => {
    expect(getDateTimeFormat('en-US', { hour: 'numeric', timeZone: TOKYO })).toBe(
      getDateTimeFormat('en-US', { hour: 'numeric', timeZone: TOKYO })
    );
    expect(getDateTimeFormat('en-US', { hour: 'numeric', timeZone: TOKYO })).not.toBe(
      getDateTimeFormat('en-US', { hour: 'numeric', timeZone: NEW_YORK })
    );
  });
});

import { formatDay, formatShort, formatTime, formatBytes, formatRelative } from './format';

const now = new Date(2026, 10, 15, 12, 0);

describe('formatTime', () => {
  it('formats the time of day for a locale', () => {
    expect(formatTime(new Date(2026, 10, 15, 9, 5), 'en-US')).toBe('9:05 AM');
    expect(formatTime(new Date(2026, 10, 15, 21, 5), 'de-DE')).toBe('21:05');
  });
});

describe('formatDay', () => {
  it('says Today and Yesterday', () => {
    expect(formatDay(new Date(2026, 10, 15, 8), 'en-US', now)).toBe('Today');
    expect(formatDay(new Date(2026, 10, 14, 8), 'en-US', now)).toBe('Yesterday');
  });

  it('gives a weekday within the last week', () => {
    expect(formatDay(new Date(2026, 10, 11, 8), 'en-US', now)).toBe('Wednesday');
  });

  it('gives a date, with the year only when it differs', () => {
    expect(formatDay(new Date(2026, 9, 1), 'en-US', now)).toBe('October 1');
    expect(formatDay(new Date(2025, 9, 1), 'en-US', now)).toBe('October 1, 2025');
  });

  it('uses the browser locale by default', () => {
    expect(formatDay(new Date())).toBeTruthy();
  });
});

describe('formatShort', () => {
  it('gives a time today, a weekday this week, else a short date', () => {
    expect(formatShort(new Date(2026, 10, 15, 9, 5), 'en-US', now)).toBe('9:05 AM');
    expect(formatShort(new Date(2026, 10, 12, 9), 'en-US', now)).toBe('Thu');
    expect(formatShort(new Date(2026, 10, 3), 'en-US', now)).toBe('Nov 3');
  });

  it('uses the current time by default', () => {
    expect(formatShort(new Date())).toBeTruthy();
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
    expect(formatRelative(ago(30 * 1000), 'en-US', now)).toBe('now');
    expect(formatRelative(ago(5 * MINUTE), 'en-US', now)).toBe('5 minutes ago');
    expect(formatRelative(ago(2 * 60 * MINUTE), 'en-US', now)).toBe('2 hours ago');
    expect(formatRelative(ago(24 * 60 * MINUTE), 'en-US', now)).toBe('yesterday');
    expect(formatRelative(ago(3 * 24 * 60 * MINUTE), 'en-US', now)).toBe('3 days ago');
  });

  it('measures from the current time by default', () => {
    expect(formatRelative(new Date(), 'en-US')).toBe('now');
  });
});

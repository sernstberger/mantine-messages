import { dayKey, toDate } from './dates';

describe('dates', () => {
  it('turns Date, string and number into a Date', () => {
    const date = new Date(2026, 10, 15, 9);
    expect(toDate(date)).toBe(date);
    expect(toDate(date.getTime()).getTime()).toBe(date.getTime());
    expect(toDate(date.toISOString()).getTime()).toBe(date.getTime());
  });

  it('gives one key per local day', () => {
    expect(dayKey(new Date(2026, 10, 15, 0, 1))).toBe(dayKey(new Date(2026, 10, 15, 23, 59)));
    expect(dayKey(new Date(2026, 10, 15))).not.toBe(dayKey(new Date(2026, 10, 16)));
  });
});

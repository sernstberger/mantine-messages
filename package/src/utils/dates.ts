import type { MessageDate } from '../types';

export const toDate = (value: MessageDate) => (value instanceof Date ? value : new Date(value));

export function dayKey(value: MessageDate) {
  const date = toDate(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

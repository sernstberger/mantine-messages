import type { MessageDate } from '../types';

export const toDate = (value: MessageDate) => (value instanceof Date ? value : new Date(value));

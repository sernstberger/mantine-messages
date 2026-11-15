import type { AssistantMessage } from '../types';

/** Text parts joined by a blank line: what Copy copies and what screen readers hear */
export function getAssistantText(message: Pick<AssistantMessage, 'parts'>): string {
  return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n');
}

export function formatJson(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

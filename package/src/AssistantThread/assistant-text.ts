import type { AssistantMessage } from '../types';

/** Text parts joined by a blank line: what Copy copies and what screen readers hear */
export function getAssistantText(message: Pick<AssistantMessage, 'parts'>): string {
  return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n');
}

/** A tool's input or output for display: strings as they are, anything else as indented JSON */
export function formatJson(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

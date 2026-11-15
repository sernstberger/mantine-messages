import type { ChatMessage } from '../types';

/** Markdown reduced to plain text, on one line */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(^|\W)__(.+?)__(?=\W|$)/g, '$1$2')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain text of a message for previews, quotes and labels */
export function getPreview(message: Pick<ChatMessage, 'body' | 'format' | 'preview'>): string {
  if (message.preview !== undefined) {
    return message.preview;
  }

  return message.format === 'markdown' ? stripMarkdown(message.body) : message.body;
}

/** `text` cut to `max` characters, ending in an ellipsis when cut */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

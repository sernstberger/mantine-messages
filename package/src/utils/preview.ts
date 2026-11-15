import type { ChatMessage } from '../types';

/** Markdown reduced to plain text, on one line */
export function stripMarkdown(text: string): string {
  return (
    text
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
      // Table separator rows and horizontal rules: only dashes, colons, pipes and spaces
      .replace(/^[\s|:-]*-{3,}[\s|:-]*$/gm, '')
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Plain text of a message for previews, quotes and labels */
export function getPreview(message: Pick<ChatMessage, 'body' | 'format' | 'preview'>): string {
  if (message.preview !== undefined) {
    return message.preview;
  }

  return message.format === 'markdown' ? stripMarkdown(message.body) : message.body;
}

type PreviewSource = Pick<ChatMessage, 'body' | 'format' | 'preview'>;

const previews = new WeakMap<PreviewSource, PreviewSource & { result: string }>();

/**
 * `getPreview`, remembered per message object: stripping markdown is 15 passes over the body, and
 * a thread needs the preview of every message on every render. A message changed in place (same
 * object, new body) is noticed and stripped again
 */
export function getCachedPreview(message: PreviewSource): string {
  const hit = previews.get(message);

  if (
    hit &&
    hit.body === message.body &&
    hit.format === message.format &&
    hit.preview === message.preview
  ) {
    return hit.result;
  }

  const result = getPreview(message);
  previews.set(message, {
    body: message.body,
    format: message.format,
    preview: message.preview,
    result,
  });
  return result;
}

/** `text` cut to `max` characters, ending in an ellipsis when cut */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

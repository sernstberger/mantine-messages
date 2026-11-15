import React from 'react';
import type { MarkdownAdapter } from './MarkdownAdapterProvider';

export interface ReactMarkdownAdapterOptions {
  /** Remark plugins, for example `[remarkGfm]` for tables and task lists: none are added for you */
  remarkPlugins?: unknown[];

  /** Renderers by tag name, replacing MarkdownBody's own for `a`, `code` and `pre`, and adding others */
  components?: Record<string, React.ComponentType<any>>;

  /** Set `false` when a remark plugin can change where blocks end, `true` by default */
  splitBlocks?: boolean;
}

/**
 * Adapter for react-markdown, which you install and pass in as `Markdown` (its default export).
 * Raw HTML in the text shows as text, as it does in react-markdown without rehype plugins
 */
export function createReactMarkdownAdapter(
  Markdown: React.ComponentType<any>,
  { remarkPlugins, components, splitBlocks }: ReactMarkdownAdapterOptions = {}
): MarkdownAdapter {
  return {
    splitBlocks,
    render: (markdown, renderers) => (
      <Markdown remarkPlugins={remarkPlugins} components={{ ...renderers, ...components }}>
        {markdown}
      </Markdown>
    ),
  };
}

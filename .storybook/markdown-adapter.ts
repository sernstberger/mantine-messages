import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownAdapter } from '../package/src/MarkdownBody/MarkdownAdapterProvider';
import { createReactMarkdownAdapter } from '../package/src/MarkdownBody/react-markdown-adapter';

/** What an app does once: react-markdown with GitHub flavoured markdown, for stories that show markdown */
export const markdownAdapter: MarkdownAdapter = createReactMarkdownAdapter(Markdown, {
  remarkPlugins: [remarkGfm],
});

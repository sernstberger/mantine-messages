import React from 'react';
import type { Components, Options } from 'react-markdown';

/**
 * react-markdown is ESM only and Jest runs CommonJS, so tests get this stand-in (see
 * jest.config.cjs). It understands just enough markdown to call the components it is given:
 * fenced code blocks, inline code and links. The real rendering is checked in Storybook.
 */

/** Options of every render, newest last; tests empty it in beforeEach */
export const markdownRenders: Options[] = [];

const TOKENS = /```(\w*)\n([\s\S]*?)```|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

export default function Markdown(options: Options) {
  markdownRenders.push(options);
  const components: Components = options.components ?? {};
  const element = (tag: 'a' | 'code' | 'pre', props: Record<string, unknown>, key?: number) => {
    const Component = (components[tag] ?? tag) as React.ElementType;
    return <Component key={key} {...props} />;
  };

  const text = options.children ?? '';
  const output: React.ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKENS)) {
    const [whole, language, code, inline, label, href] = match;
    output.push(text.slice(last, match.index));

    if (code !== undefined) {
      const className = language ? `language-${language}` : undefined;
      output.push(
        element('pre', { children: element('code', { className, children: code }) }, match.index)
      );
    } else if (inline !== undefined) {
      output.push(element('code', { children: inline }, match.index));
    } else {
      output.push(element('a', { href, children: label }, match.index));
    }

    last = match.index! + whole.length;
  }

  output.push(text.slice(last));
  return <div data-testid="markdown">{output}</div>;
}

export const defaultUrlTransform = (url: string) => url;

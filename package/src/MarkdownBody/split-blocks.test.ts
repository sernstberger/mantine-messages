import { splitMarkdownBlocks } from './split-blocks';

// The real parser's view of these splits is checked by scripts/check-markdown-blocks
describe('splitMarkdownBlocks', () => {
  it('splits at blank lines before a line at the left edge, and joins back into the text', () => {
    const text = '# Title\n\nOne\ntwo\n\n\nThree';
    const blocks = splitMarkdownBlocks(text);
    expect(blocks).toEqual(['# Title\n\n', 'One\ntwo\n\n\n', 'Three']);
    expect(blocks.join('')).toBe(text);
  });

  it('gives empty text as one empty block', () => {
    expect(splitMarkdownBlocks('')).toEqual(['']);
  });

  it('keeps leading blank lines with the first block', () => {
    expect(splitMarkdownBlocks('\n\nOne\n\nTwo')).toEqual(['\n\nOne\n\n', 'Two']);
  });

  it('keeps list items together, loose ones included', () => {
    expect(splitMarkdownBlocks('- a\n\n- b\n\n1. c\n\n2) d\n\nAfter')).toEqual([
      '- a\n\n- b\n\n1. c\n\n2) d\n\n',
      'After',
    ]);
  });

  it('keeps indented lines with the block above: list continuations and indented code', () => {
    expect(splitMarkdownBlocks('- a\n\n  more\n\n    code\n\nAfter')).toEqual([
      '- a\n\n  more\n\n    code\n\n',
      'After',
    ]);
  });

  it('never splits inside a code fence, closed by the same fence character', () => {
    const text = '```\none\n\n~~~\n\ntwo\n```\n\nAfter';
    expect(splitMarkdownBlocks(text)).toEqual(['```\none\n\n~~~\n\ntwo\n```\n\n', 'After']);
  });

  it('closes a fence only with one at least as long and with nothing after it', () => {
    const text = '````\n```\n\nx\n```` js\n\ny\n````\n\nAfter';
    expect(splitMarkdownBlocks(text)).toEqual(['````\n```\n\nx\n```` js\n\ny\n````\n\n', 'After']);
  });

  it('keeps an unclosed fence open to the end, as while it streams', () => {
    expect(splitMarkdownBlocks('Text\n\n```py\na\n\nb')).toEqual(['Text\n\n', '```py\na\n\nb']);
  });

  it('treats backticks with a backtick after them as inline code, not a fence', () => {
    expect(splitMarkdownBlocks('```a`b```\n\nNext')).toEqual(['```a`b```\n\n', 'Next']);
  });

  it('keeps tilde fences whose info string has backticks', () => {
    expect(splitMarkdownBlocks('~~~ a`b\n\nx\n~~~\n\nNext')).toEqual([
      '~~~ a`b\n\nx\n~~~\n\n',
      'Next',
    ]);
  });

  it('does not split text with link reference or footnote definitions', () => {
    expect(splitMarkdownBlocks('[a][1]\n\nb\n\n[1]: https://x.dev')).toHaveLength(1);
    expect(splitMarkdownBlocks('a[^1]\n\nb\n\n[^1]: Note')).toHaveLength(1);
  });

  it('does not split text with HTML blocks that run on across blank lines', () => {
    expect(splitMarkdownBlocks('a\n\n<!-- x\n\ny -->\n\nb')).toHaveLength(1);
    expect(splitMarkdownBlocks('a\n\n<pre>\n\nx\n</pre>\n\nb')).toHaveLength(1);
    expect(splitMarkdownBlocks('a\n\n<?php\n\n?>\n\nb')).toHaveLength(1);
    expect(splitMarkdownBlocks('a\n\n<div>\n\nb')).toHaveLength(3);
  });
});

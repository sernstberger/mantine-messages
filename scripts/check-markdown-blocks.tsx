import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import signale from 'signale';
import { splitMarkdownBlocks } from '../package/src/MarkdownBody/split-blocks';

/**
 * MarkdownBody parses its text block by block (see split-blocks.ts). Jest runs a stand-in for
 * react-markdown, so this checks the split against the real parser: for every sample, and for
 * every prefix of it (the text as it streams in, one character at a time), the blocks rendered
 * one by one and joined by a newline must be the same HTML as the whole text rendered at once.
 *
 *   tsx scripts/check-markdown-blocks
 */
const render = (text: string) =>
  renderToStaticMarkup(<Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>);

const samples: Record<string, string> = {
  paragraphs:
    'One paragraph\nwith a soft break.\n\nAnother **bold** one.\n\n\n\nAfter more blanks.\n',
  'leading blank lines': '\n\n\nText after blank lines\n\nand more',
  headings: '# Title\n\nIntro\n\nSetext\n======\n\nText\n\n## Sub\n\n---\n\nEnd',
  'tight and loose lists':
    '- one\n- two\n\n- three, now loose\n\n1. first\n2. second\n\n3) other\n\nAfter the list',
  'list continuations':
    '- item\n\n  continued paragraph\n\n      indented code in item\n\n  ```js\n  const a = 1;\n\n  const b = 2;\n  ```\n\nOutside',
  'nested lists': '1. a\n   - b\n\n   - c\n2. d\n\n* star\n+ plus\n\nDone',
  'lists after paragraphs': 'Intro:\n\n- a\n- b\n\n2024. was a year\n\n-not a list',
  'fenced code':
    'Text\n\n```ts\nconst a = 1;\n\n\nconst b = 2;\n```\n\n~~~\n```\n\nstill code\n~~~\n\nAfter',
  'longer and indented fences':
    '````md\n```\ninner\n```\n\n````\n\n   ```\n   indented fence\n\n   ```\n\nEnd',
  'inline backticks that look like a fence': '```a`b```\n\nnext paragraph\n\n```\ncode\n```',
  'unclosed fence': 'Text\n\n```python\ndef f():\n\n    return 1\n\nprint(f())',
  'indented code': 'Para\n\n    code line\n\n    more code\n\nAfter',
  blockquotes: '> quoted\n> lines\n\n> another quote\n\n>\n> - list in quote\n\nNot quoted',
  tables: '| a | b |\n|---|:-:|\n| 1 | 2 |\n\nText\n\n| c |\n| - |\n| 3 |',
  gfm: '- [ ] task\n- [x] done\n\n~~gone~~ and https://mantine.dev and www.example.com\n\nEnd',
  'thematic breaks': 'a\n\n***\n\n- - -\n\n___\n\nb',
  'reference links': 'See [docs][1].\n\nMore text\n\n[1]: https://mantine.dev',
  footnotes: 'Claim[^note].\n\nMore\n\n[^note]: Source.',
  'html comment': 'a\n\n<!-- a comment\n\nstill comment -->\n\nb',
  'html pre': 'a\n\n<pre>\n\nraw\n\n</pre>\n\nb',
  'html block': 'a\n\n<div>\n\ntext\n\n</div>\n\nb',
  'emphasis and links':
    '*Start of a paragraph*\n\n_under_ and [link](https://x.dev "title")\n\n**end**',
  'crlf line endings': 'One\r\n\r\nTwo\r\n\r\n- a\r\n- b\r\n',
};

// A long answer like an assistant streams: headings, lists, code and tables, repeated
const section = (n: number) =>
  `## Step ${n}\n\nInstall the package and wrap your app:\n\n` +
  `- first item with \`code\`\n- second item\n\n` +
  `\`\`\`tsx\nimport { MantineProvider } from '@mantine/core';\n\nexport function App() {\n  return <MantineProvider />;\n}\n\`\`\`\n\n` +
  `| prop | type |\n| --- | --- |\n| size | number |\n\n> Note ${n}: see the docs.\n\n`;
samples['long answer'] = Array.from({ length: 6 }, (_, n) => section(n + 1)).join('');

let failures = 0;
let checks = 0;

for (const [name, text] of Object.entries(samples)) {
  for (let length = 0; length <= text.length; length += 1) {
    const prefix = text.slice(0, length);
    const blocks = splitMarkdownBlocks(prefix);
    checks += 1;

    if (blocks.join('') !== prefix) {
      failures += 1;
      signale.error(`${name}: the blocks do not join back into the text at ${length}`);
      break;
    }

    const whole = render(prefix);
    const split = blocks.map(render).join('\n');

    if (whole !== split) {
      failures += 1;
      signale.error(`${name}: different HTML at ${length} characters`);
      signale.log(JSON.stringify(blocks));
      signale.log(`whole: ${JSON.stringify(whole)}`);
      signale.log(`split: ${JSON.stringify(split)}`);
      break;
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

signale.success(`Markdown blocks render the same as the whole text (${checks} prefixes)`);

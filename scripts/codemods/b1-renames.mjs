import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['package/src', 'docs', 'e2e', 'README.md', 'CHANGELOG.md'];
const SKIP = new Set(['node_modules', 'dist', 'specs', 'docgen.json', '.next', 'out']);

const everywhere = [
  [/\bcontrolRef\b/g, 'handlersRef'],
  [/\bMessageListControl\b/g, 'MessageListHandlers'],
  [/\bdefaultSearch\b/g, 'defaultSearchValue'],
  [/\bonThread\b/g, 'onOpenThread'],
];

const byFile = [
  [
    /(^|\/)Reactions\/Reactions(\.test)?\.tsx$/,
    [
      [/ElementProps<'div', 'onToggle'>/g, "ElementProps<'div'>"],
      [/\bonToggle\b/g, 'onToggleReaction'],
    ],
  ],
  [/(^|\/)(ChatThread|TeamThread)\.tsx$/, [[/\bonToggle=\{/g, 'onToggleReaction={']]],
  [/(^|\/)Inbox\/Inbox(\.test)?\.tsx$/, [[/(\s)search=/g, '$1searchValue=']]],
];

function walk(path, out) {
  const s = statSync(path);
  if (s.isFile()) return out.push(path);
  for (const name of readdirSync(path)) {
    if (!SKIP.has(name)) walk(join(path, name), out);
  }
}

const files = [];
for (const root of ROOTS) walk(root, files);

for (const file of files) {
  if (!/\.(tsx?|mdx?|css)$/.test(file)) continue;
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [re, to] of everywhere) after = after.replace(re, to);
  for (const [match, rules] of byFile) {
    if (match.test(file)) for (const [re, to] of rules) after = after.replace(re, to);
  }
  if (after !== before) writeFileSync(file, after);
}

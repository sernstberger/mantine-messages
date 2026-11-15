// A fence opening or closing line: three or more backticks or tildes, at any indentation (fences
// inside list items are indented)
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;

// A list item marker at the start of a line: `-`, `*`, `+`, `1.` or `1)`, then a space or the end
const LIST_ITEM = /^(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/;

// Link reference and footnote definitions apply to the whole document, so a block parsed on its
// own would lose them
const DEFINITION = /^ {0,3}\[[^\]]+\]:/m;

// HTML blocks that run on across blank lines (comments, `<pre>`, `<script>` and the like)
const LONG_HTML = /^ {0,3}<(?:!|\?|(?:pre|script|style|textarea)(?:[\s>]|$))/im;

/**
 * Markdown split into top-level blocks that parse to the same elements one by one as the whole
 * text does. A split goes only where a blank line outside a code fence is followed by a line that
 * starts at the left edge and is not a list item, so lists (loose ones included), indented
 * continuations and code blocks stay whole. Text with definitions or long HTML blocks is not split.
 *
 * The blocks joined together are the text again. While text streams in, only the last block
 * changes, so the blocks before it keep their parsed elements.
 */
export function splitMarkdownBlocks(text: string): string[] {
  if (DEFINITION.test(text) || LONG_HTML.test(text)) {
    return [text];
  }

  const lines = text.split('\n');
  const blocks: string[] = [];
  let start = 0;
  let fence: string | null = null;
  let afterBlank = false;
  let content = false;

  lines.forEach((line, index) => {
    const marker = FENCE.exec(line);

    if (fence !== null) {
      // A closing fence: the same character, at least as long, and nothing after it
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      ) {
        fence = null;
      }

      return;
    }

    if (!line.trim()) {
      // Blank lines before any content start no block
      afterBlank = content;
      return;
    }

    if (afterBlank && !/^\s/.test(line) && !LIST_ITEM.test(line)) {
      blocks.push(`${lines.slice(start, index).join('\n')}\n`);
      start = index;
    }

    afterBlank = false;
    content = true;

    // An info string after backticks cannot hold a backtick; such a line is inline code
    if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) {
      fence = marker[1];
    }
  });

  blocks.push(lines.slice(start).join('\n'));
  return blocks;
}

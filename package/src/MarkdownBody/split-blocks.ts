const FENCE_LINE = /^\s*(`{3,}|~{3,})(.*)$/;

const LIST_ITEM_START = /^(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/;

// Definitions apply to the whole document, so a block parsed on its own would lose them
const LINK_OR_FOOTNOTE_DEFINITION = /^ {0,3}\[[^\]]+\]:/m;

const HTML_BLOCK_THAT_SPANS_BLANK_LINES =
  /^ {0,3}<(?:!|\?|(?:pre|script|style|textarea)(?:[\s>]|$))/im;

export function splitMarkdownBlocks(text: string): string[] {
  if (LINK_OR_FOOTNOTE_DEFINITION.test(text) || HTML_BLOCK_THAT_SPANS_BLANK_LINES.test(text)) {
    return [text];
  }

  const lines = text.split('\n');
  const blocks: string[] = [];
  let start = 0;
  let fence: string | null = null;
  let afterBlank = false;
  let content = false;

  lines.forEach((line, index) => {
    const marker = FENCE_LINE.exec(line);

    if (fence !== null) {
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
      afterBlank = content;
      return;
    }

    if (afterBlank && !/^\s/.test(line) && !LIST_ITEM_START.test(line)) {
      blocks.push(`${lines.slice(start, index).join('\n')}\n`);
      start = index;
    }

    afterBlank = false;
    content = true;

    // A backtick in the info string after backticks makes the line inline code, not a fence
    if (marker && !(marker[1][0] === '`' && marker[2].includes('`'))) {
      fence = marker[1];
    }
  });

  blocks.push(lines.slice(start).join('\n'));
  return blocks;
}

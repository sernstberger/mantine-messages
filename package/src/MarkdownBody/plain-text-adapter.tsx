import React from 'react';
import type { MarkdownAdapter } from './MarkdownAdapterProvider';

/** The default adapter: the text as it is, with its line breaks */
export const plainTextMarkdownAdapter: MarkdownAdapter = {
  splitBlocks: false,
  render: (markdown) =>
    markdown.split(/\r?\n/).map((line, index) => (
      <React.Fragment key={index}>
        {index > 0 && <br />}
        {line}
      </React.Fragment>
    )),
};

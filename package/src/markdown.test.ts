import * as markdown from './markdown';

describe('mantine-messages/markdown', () => {
  it('exports MarkdownBody', () => {
    expect(Object.keys(markdown).sort()).toEqual(['MarkdownBody']);
    expect(Object.values(markdown).every((value) => value !== undefined)).toBe(true);
  });
});

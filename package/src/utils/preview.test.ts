import { getPreview, stripMarkdown, truncate } from './preview';

describe('stripMarkdown', () => {
  it('removes emphasis, code, links, headings, quotes and list marks', () => {
    expect(stripMarkdown('**Bold** and *it* and _em_ and ~~old~~')).toBe(
      'Bold and it and em and old'
    );
    expect(stripMarkdown('Run `npm test` then [the docs](https://x.dev)')).toBe(
      'Run npm test then the docs'
    );
    expect(stripMarkdown('![chart](a.png)')).toBe('chart');
    expect(stripMarkdown('# Title\n> quoted\n- one\n* two')).toBe('Title quoted one two');
    expect(stripMarkdown('```ts\nconst a = 1;\n```')).toBe('const a = 1;');
  });

  it('keeps underscores inside words', () => {
    expect(stripMarkdown('rename snake_case_name')).toBe('rename snake_case_name');
  });
});

describe('getPreview', () => {
  it('prefers preview, then strips markdown, else returns the body', () => {
    expect(getPreview({ body: '**x**', format: 'markdown', preview: 'Custom' })).toBe('Custom');
    expect(getPreview({ body: '**x**', format: 'markdown' })).toBe('x');
    expect(getPreview({ body: '**x**' })).toBe('**x**');
  });
});

describe('truncate', () => {
  it('cuts long text with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});

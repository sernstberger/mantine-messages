import { getCachedPreview, getPreview, stripMarkdown, truncate } from './preview';

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

  it('drops table pipes, table separators and horizontal rules', () => {
    expect(
      stripMarkdown('| Wait | Feels like |\n| --- | :---: |\n| 150 ms | instant |\n\n---\nDone')
    ).toBe('Wait Feels like 150 ms instant Done');
  });
});

describe('getPreview', () => {
  it('prefers preview, then strips markdown, else returns the body', () => {
    expect(getPreview({ body: '**x**', format: 'markdown', preview: 'Custom' })).toBe('Custom');
    expect(getPreview({ body: '**x**', format: 'markdown' })).toBe('x');
    expect(getPreview({ body: '**x**' })).toBe('**x**');
  });
});

describe('getCachedPreview', () => {
  it('strips each message once, and again when it changes in place', () => {
    const message: { body: string; format: 'markdown'; preview?: string } = {
      body: '**a**',
      format: 'markdown',
    };
    expect(getCachedPreview(message)).toBe('a');

    message.body = '**b**';
    expect(getCachedPreview(message)).toBe('b');
    message.preview = 'Custom';
    expect(getCachedPreview(message)).toBe('Custom');
  });

  it('answers from the cache for the same message', () => {
    const message = { body: '**same**', format: 'markdown' as const };
    const first = getCachedPreview(message);
    const replace = jest.spyOn(String.prototype, 'replace');
    expect(getCachedPreview(message)).toBe(first);
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });
});

describe('truncate', () => {
  it('cuts long text with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});

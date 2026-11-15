import * as messages from './index';

describe('mantine-messages', () => {
  it('exports the components and helpers', () => {
    expect(Object.keys(messages).sort()).toEqual([
      'ChatThread',
      'Composer',
      'Inbox',
      'getPreview',
      'groupMessages',
      'stripMarkdown',
      'truncate',
    ]);
    expect(Object.values(messages).every((value) => value !== undefined)).toBe(true);
  });
});

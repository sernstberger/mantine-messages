import * as messages from './index';

describe('mantine-messages', () => {
  it('exports the components and helpers', () => {
    expect(Object.keys(messages).sort()).toEqual([
      'ChatThread',
      'Composer',
      'Inbox',
      'MessageActions',
      'MessageList',
      'MessageListBase',
      'getPreview',
      'groupMessages',
      'stripMarkdown',
      'truncate',
      'useMessageList',
    ]);
    expect(Object.values(messages).every((value) => value !== undefined)).toBe(true);
  });
});

import * as messages from './index';

describe('mantine-messages', () => {
  it('exports the components and helpers', () => {
    expect(Object.keys(messages).sort()).toEqual([
      'Attachments',
      'ChatThread',
      'Composer',
      'Inbox',
      'Message',
      'MessageActions',
      'MessageList',
      'MessageListBase',
      'MessagesShell',
      'Reactions',
      'TeamThread',
      'ThreadPanel',
      'getPreview',
      'stripMarkdown',
      'truncate',
      'useMessageList',
    ]);
    expect(Object.values(messages).every((value) => value !== undefined)).toBe(true);
  });
});

import * as messages from './index';
import type { MessageAvatarFactory, MessageBodyFactory, MessageMetaFactory } from './index';

describe('mantine-messages', () => {
  it('exports the components and helpers', () => {
    expect(Object.keys(messages).sort()).toEqual([
      'AssistantThread',
      'Attachments',
      'ChatThread',
      'Composer',
      'Inbox',
      'MarkdownAdapterProvider',
      'MarkdownBody',
      'Message',
      'MessageActions',
      'MessageList',
      'MessagesShell',
      'Reactions',
      'TeamThread',
      'ThreadPanel',
      'createReactMarkdownAdapter',
      'getAssistantText',
      'getPreview',
      'plainTextMarkdownAdapter',
      'stripMarkdown',
      'truncate',
      'useMarkdownAdapter',
      'useMessageList',
    ]);
    expect(Object.values(messages).every((value) => value !== undefined)).toBe(true);
  });

  it('exports the factory types of the Message parts, for theme overrides', () => {
    const overrides: [
      Partial<MessageAvatarFactory['props']>,
      Partial<MessageBodyFactory['props']>,
      Partial<MessageMetaFactory['props']>,
    ] = [{ src: null }, { className: 'body' }, { className: 'meta' }];
    expect(messages.Message.Avatar.extend({ defaultProps: overrides[0] })).toBeDefined();
  });
});

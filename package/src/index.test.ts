import * as messages from './index';
import type { ChatThread, Inbox, Message, MessagesShell, TeamThread, ThreadPanel } from './index';
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

  it('resolves the type namespaces of components and parts', () => {
    const inbox: Partial<Inbox.Props> = {};
    const inboxStyles: Inbox.StylesNames = 'search';
    const inboxVars: Inbox.CssVariables = { root: '--inbox-radius' };
    const inboxLabels: Partial<Inbox.Labels> = {};
    const inboxFactory: Partial<Inbox.Factory['props']> = inbox;
    const bubble: ChatThread.Bubble.Props = {};
    const bubbleStyles: ChatThread.Bubble.StylesNames = 'bubble';
    const avatar: Partial<Message.Avatar.Props> = {};
    const avatarStyles: Message.Avatar.StylesNames = 'avatar';
    const replies: ThreadPanel.Replies.StylesNames = 'divider';
    const footer: ThreadPanel.Footer.Props = {};
    const summary: TeamThread.ThreadSummary.StylesNames = 'threadCount';
    const toggle: MessagesShell.AsideToggle.Props = {};
    const toggleFactory: MessagesShell.AsideToggle.Factory['stylesNames'] = 'asideToggle';

    expect([
      inbox,
      inboxStyles,
      inboxVars,
      inboxLabels,
      inboxFactory,
      bubble,
      bubbleStyles,
      avatar,
      avatarStyles,
      replies,
      footer,
      summary,
      toggle,
      toggleFactory,
    ]).toHaveLength(14);
  });
});

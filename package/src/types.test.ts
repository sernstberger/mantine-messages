import type {
  AssistantMessage,
  ChatMessage,
  Conversation,
  MessageBase,
  SystemEvent,
} from './types';

describe('types', () => {
  it('builds chat messages and events on one base', () => {
    const base: MessageBase = { id: 'a', authorId: 'maya', createdAt: 0 };
    const chat: ChatMessage = {
      ...base,
      body: '**Hi**',
      format: 'markdown',
      preview: 'Hi',
      threadId: 't1',
      thread: { count: 2, lastReplyAt: 1, participantIds: ['maya'] },
      editedAt: 2,
      visibility: 'internal',
    };
    const event: SystemEvent = { ...base, id: 'e', kind: 'event', text: 'Maya joined' };
    const conversation: Conversation = {
      id: 'c',
      title: 'Design',
      kind: 'channel',
      lastMessage: { authorId: 'maya', body: chat.body, format: 'markdown', createdAt: 0 },
    };

    expect([chat.id, event.kind, conversation.kind]).toEqual(['a', 'event', 'channel']);
  });
  it('builds assistant prompts and answers from parts', () => {
    const answer: AssistantMessage = {
      id: 'a1',
      authorId: 'assistant',
      createdAt: 0,
      role: 'assistant',
      status: 'error',
      error: 'Timed out',
      parts: [
        { type: 'reasoning', text: 'Thinking', state: 'done' },
        { type: 'tool', name: 'search', input: { q: 'x' }, output: [], state: 'done' },
        { type: 'text', text: '**Hi**', state: 'streaming' },
      ],
    };

    expect(answer.parts.map((part) => part.type)).toEqual(['reasoning', 'tool', 'text']);
  });
});

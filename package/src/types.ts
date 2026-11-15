/** A person who takes part in conversations */
export interface MessagesUser {
  id: string;
  name: string;

  /** Image url for the avatar; initials are shown when it is missing */
  avatar?: string;
}

/** Delivery state of a message the current user sent */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** A file sent with a message */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;

  /** Size in bytes */
  size?: number;

  /** Width and height of an image in pixels; they reserve its box before it loads */
  width?: number;
  height?: number;
}

/** An emoji reaction and who left it */
export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

/** A value that `new Date()` accepts */
export type MessageDate = Date | string | number;

/** What every item in a message list has */
export interface MessageBase {
  id: string;

  /** `id` of the `MessagesUser` who wrote it */
  authorId: string;
  createdAt: MessageDate;
}

/** Replies in a Slack-style thread under a message */
export interface MessageThreadSummary {
  count: number;
  lastReplyAt: MessageDate;
  participantIds: string[];
}

/** A message people send each other, in ChatThread and TeamThread */
export interface ChatMessage extends MessageBase {
  body: string;

  /** How `body` is written, `'text'` by default; markdown needs `MarkdownBody` and a `MarkdownAdapterProvider` */
  format?: 'text' | 'markdown';

  /** Plain text for inbox previews, quotes and labels; derived from `body` when missing */
  preview?: string;
  status?: MessageStatus;

  /** `id` of the message this one replies to */
  replyToId?: string;

  /** `id` of the message whose thread this one belongs to */
  threadId?: string;

  /** Set on a message that has thread replies */
  thread?: MessageThreadSummary;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  editedAt?: MessageDate;

  /** `'internal'` for notes only teammates see, `'public'` by default */
  visibility?: 'public' | 'internal';
}

/** Something that happened in a conversation, for example "Maya joined" */
export interface SystemEvent extends MessageBase {
  kind: 'event';
  text: string;
}

/** One row of an inbox */
export interface Conversation {
  id: string;
  title: string;

  /** Image url; initials of the title are shown when it is missing */
  avatar?: string;
  participants?: MessagesUser[];
  /** What the conversation is, for icons and grouping in an inbox */
  kind?: 'direct' | 'group' | 'channel';
  lastMessage?: Pick<ChatMessage, 'body' | 'format' | 'preview' | 'createdAt' | 'authorId'>;
  unreadCount?: number;
  muted?: boolean;
  pinned?: boolean;
}

/** One piece of an assistant answer; parts render in order */
export type AssistantPart =
  | {
      type: 'text';

      /** Markdown */
      text: string;

      /** `'streaming'` while tokens arrive: a cursor blinks at its end */
      state?: 'streaming' | 'done';
    }
  | {
      type: 'reasoning';
      text: string;
      state?: 'streaming' | 'done';
    }
  | {
      type: 'tool';

      /** Tool name, for example `'search_docs'` */
      name: string;
      input: unknown;
      output?: unknown;
      state: 'running' | 'done' | 'error';
    };

/** A prompt (`role: 'user'`) or an answer (`role: 'assistant'`) in AssistantThread */
export interface AssistantMessage extends MessageBase {
  role: 'user' | 'assistant';
  parts: AssistantPart[];

  /** `'streaming'` while the answer is generated; `'error'` shows an alert */
  status?: 'streaming' | 'done' | 'error';

  /** What went wrong, shown in the alert when `status` is `'error'` */
  error?: string;
}

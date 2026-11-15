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
}

/** An emoji reaction and who left it */
export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

/** A value that `new Date()` accepts */
export type MessageDate = Date | string | number;

export interface Message {
  id: string;

  /** `id` of the `MessagesUser` who wrote the message */
  authorId: string;
  body: string;
  createdAt: MessageDate;
  status?: MessageStatus;

  /** `id` of the message this one replies to */
  replyToId?: string;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

/** One row of an inbox */
export interface Conversation {
  id: string;
  title: string;

  /** Image url; initials of the title are shown when it is missing */
  avatar?: string;
  participants?: MessagesUser[];
  lastMessage?: Pick<Message, 'body' | 'createdAt' | 'authorId'>;
  unreadCount?: number;
  muted?: boolean;
  pinned?: boolean;
}

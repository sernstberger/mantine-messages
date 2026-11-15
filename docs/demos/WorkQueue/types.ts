import type { ChatMessage, MessageBase, MessagesUser, SystemEvent } from 'mantine-messages';

export type TicketStatus = 'open' | 'pending' | 'closed';

export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';

/** An email in a ticket's timeline, shown as a card; the full message opens in a modal */
export interface EmailItem extends MessageBase {
  kind: 'email';
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  subject: string;

  /** Plain text body */
  text: string;
}

/**
 * One entry of a ticket's timeline: an email, a chat message, an internal note (a ChatMessage with
 * `visibility: 'internal'`) or an event such as "Assigned to Maya"
 */
export type TimelineItem = EmailItem | ChatMessage | SystemEvent;

export interface Ticket {
  id: string;
  subject: string;

  /** `id` of the customer, a MessagesUser in the users list */
  customerId: string;
  status: TicketStatus;
  priority: TicketPriority;

  /** `id` of the agent working on it, or null */
  assigneeId: string | null;
  tags: string[];
  createdAt: Date;

  /** When the next answer is due */
  slaDueAt: Date;

  /** Hidden from the default view until then */
  snoozedUntil: Date | null;

  /** Oldest first */
  items: TimelineItem[];

  /** The customer wrote and nobody has opened the ticket since */
  unread?: boolean;
}

/** Someone who can be assigned tickets */
export type Agent = MessagesUser;

/** Someone who writes to support */
export interface Customer extends MessagesUser {
  email: string;
}

/** Which tickets the table shows */
export type QueueView = 'inbox' | 'snoozed' | 'closed' | 'all';

export interface QueueFilters {
  view: QueueView;
  search: string;
  priority: TicketPriority | null;

  /** An agent's `id`, `'unassigned'`, or null for anyone */
  assigneeId: string | null;
}

export type SortKey = 'priority' | 'age' | 'sla';

export interface QueueSort {
  key: SortKey;
  direction: 'asc' | 'desc';
}

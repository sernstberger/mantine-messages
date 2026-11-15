import type { ChatMessage, MessagesUser, SystemEvent } from 'mantine-messages';
import type {
  Agent,
  QueueFilters,
  QueueSort,
  QueueView,
  Ticket,
  TicketPriority,
  TicketStatus,
} from './types';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'blue',
  pending: 'grape',
  closed: 'gray',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  urgent: 'red',
  high: 'orange',
  normal: 'blue',
  low: 'gray',
};

const PRIORITY_RANK: Record<TicketPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export const DEFAULT_FILTERS: QueueFilters = {
  view: 'inbox',
  search: '',
  priority: null,
  assigneeId: null,
};

/** `nameOf(id)`: the user's name, or the id for someone unknown */
export const nameGetter = (users: MessagesUser[]) => (id: string) =>
  users.find((user) => user.id === id)?.name ?? id;

export const isSnoozed = (ticket: Ticket, now: Date) =>
  ticket.snoozedUntil !== null && ticket.snoozedUntil > now;

/** Inbox: not closed and not snoozed. Snoozed: not closed, snoozed. Closed. All */
export function inView(ticket: Ticket, view: QueueView, now: Date) {
  const closed = ticket.status === 'closed';

  switch (view) {
    case 'inbox':
      return !closed && !isSnoozed(ticket, now);
    case 'snoozed':
      return !closed && isSnoozed(ticket, now);
    case 'closed':
      return closed;
    default:
      return true;
  }
}

export function countByView(tickets: Ticket[], now: Date): Record<QueueView, number> {
  const count = (view: QueueView) => tickets.filter((ticket) => inView(ticket, view, now)).length;
  return {
    inbox: count('inbox'),
    snoozed: count('snoozed'),
    closed: count('closed'),
    all: tickets.length,
  };
}

/** Tickets in the view that match the search (id, subject, customer, tags) and the filters */
export function filterTickets(
  tickets: Ticket[],
  filters: QueueFilters,
  now: Date,
  nameOf: (userId: string) => string
) {
  const search = filters.search.trim().toLowerCase();

  return tickets.filter(
    (ticket) =>
      inView(ticket, filters.view, now) &&
      (filters.priority === null || ticket.priority === filters.priority) &&
      (filters.assigneeId === null ||
        (filters.assigneeId === 'unassigned'
          ? ticket.assigneeId === null
          : ticket.assigneeId === filters.assigneeId)) &&
      [ticket.id, ticket.subject, nameOf(ticket.customerId), ...ticket.tags].some((text) =>
        text.toLowerCase().includes(search)
      )
  );
}

const sortValue: Record<QueueSort['key'], (ticket: Ticket) => number> = {
  priority: (ticket) => PRIORITY_RANK[ticket.priority],
  // Age grows as the creation time shrinks: ascending puts the newest first
  age: (ticket) => -ticket.createdAt.getTime(),
  sla: (ticket) => ticket.slaDueAt.getTime(),
};

/** A sorted copy; ties keep the order they came in */
export function sortTickets(tickets: Ticket[], sort: QueueSort) {
  const value = sortValue[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...tickets].sort((a, b) => sign * (value(a) - value(b)));
}

/** Clicking the sorted column flips its direction; another column starts ascending */
export const nextSort = (sort: QueueSort, key: QueueSort['key']): QueueSort =>
  sort.key === key
    ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' };

/** "45m", "3h", "2d" */
export function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export const formatAge = (ticket: Ticket, now: Date) =>
  formatDuration(now.getTime() - ticket.createdAt.getTime());

export interface SlaState {
  label: string;
  color: string;
}

/** Time to the next answer: red when overdue, orange within an hour; nothing to do when closed */
export function slaState(ticket: Ticket, now: Date): SlaState {
  if (ticket.status === 'closed') {
    return { label: 'Done', color: 'dimmed' };
  }

  const left = ticket.slaDueAt.getTime() - now.getTime();

  if (left < 0) {
    return { label: `Overdue ${formatDuration(left)}`, color: 'red' };
  }

  return { label: `${formatDuration(left)} left`, color: left <= 60 * 60000 ? 'orange' : 'teal' };
}

export const formatDateTime = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Quick choices in the snooze menu */
export function snoozeOptions(now: Date) {
  const at9 = (days: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9, 0);
  // Days until next Monday, 1 to 7
  const toMonday = (8 - now.getDay()) % 7 || 7;

  return [
    { label: 'In 1 hour', until: new Date(now.getTime() + 60 * 60000) },
    { label: 'Tomorrow, 9:00', until: at9(1) },
    { label: 'Next Monday, 9:00', until: at9(toMonday) },
  ];
}

export type QueueAction =
  | { type: 'assign'; ids: string[]; assignee: Agent | null; at: Date }
  | { type: 'setStatus'; ids: string[]; status: TicketStatus; at: Date }
  | { type: 'setPriority'; ids: string[]; priority: TicketPriority; at: Date }
  | { type: 'addTag'; ids: string[]; tag: string; at: Date }
  | { type: 'snooze'; ids: string[]; until: Date | null; at: Date }
  | { type: 'send'; id: string; text: string; note: boolean; at: Date };

/** What the change does to one ticket, and the event it logs; null when there is nothing to do */
function describe(
  ticket: Ticket,
  action: Exclude<QueueAction, { type: 'send' }>
): [Partial<Ticket>, string] | null {
  switch (action.type) {
    case 'assign': {
      const assigneeId = action.assignee?.id ?? null;
      return ticket.assigneeId === assigneeId
        ? null
        : [
            { assigneeId },
            action.assignee
              ? `You assigned this to ${action.assignee.name}`
              : 'You unassigned this',
          ];
    }
    case 'setStatus':
      return ticket.status === action.status
        ? null
        : [{ status: action.status }, `You changed the status to ${STATUS_LABELS[action.status]}`];
    case 'setPriority':
      return ticket.priority === action.priority
        ? null
        : [
            { priority: action.priority },
            `You changed the priority to ${PRIORITY_LABELS[action.priority]}`,
          ];
    case 'addTag':
      return ticket.tags.includes(action.tag)
        ? null
        : [{ tags: [...ticket.tags, action.tag] }, `You tagged this ${action.tag}`];
    default:
      return [
        { snoozedUntil: action.until },
        action.until
          ? `You snoozed this until ${formatDateTime(action.until)}`
          : 'You unsnoozed this',
      ];
  }
}

const nextId = (ticket: Ticket) => `${ticket.id}-${ticket.items.length + 1}`;

/** Changes to tickets; every change logs an event in the ticket's timeline */
export function queueReducer(tickets: Ticket[], action: QueueAction): Ticket[] {
  if (action.type === 'send') {
    return tickets.map((ticket) => {
      if (ticket.id !== action.id) {
        return ticket;
      }

      const message: ChatMessage = {
        id: nextId(ticket),
        authorId: 'me',
        body: action.text,
        createdAt: action.at,
        visibility: action.note ? 'internal' : 'public',
      };
      return { ...ticket, items: [...ticket.items, message] };
    });
  }

  return tickets.map((ticket) => {
    const change = action.ids.includes(ticket.id) ? describe(ticket, action) : null;

    if (!change) {
      return ticket;
    }

    const [patch, text] = change;
    const event: SystemEvent = {
      id: nextId(ticket),
      kind: 'event',
      authorId: 'me',
      text,
      createdAt: action.at,
    };
    return { ...ticket, ...patch, items: [...ticket.items, event] };
  });
}

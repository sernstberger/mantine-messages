import { agents, createTickets, users } from './data';
import {
  countByView,
  DEFAULT_FILTERS,
  filterTickets,
  formatAge,
  formatDuration,
  formatLastActivity,
  inView,
  isSnoozed,
  nameGetter,
  nextSort,
  previewOf,
  queueReducer,
  slaState,
  snoozeOptions,
  sortTickets,
} from './queue';
import type { QueueFilters, Ticket } from './types';

// A Monday
const now = new Date(2026, 10, 16, 10, 0);
const tickets = createTickets(now);
const nameOf = nameGetter(users);
const byId = (list: Ticket[], id: string) => list.find((ticket) => ticket.id === id)!;
const ids = (list: Ticket[]) => list.map((ticket) => ticket.id);
const filter = (filters: Partial<QueueFilters>) =>
  ids(filterTickets(tickets, { ...DEFAULT_FILTERS, ...filters }, now, nameOf));
const minutes = (count: number) => count * 60000;
const lastItem = (ticket: Ticket) => ticket.items[ticket.items.length - 1];

describe('nameGetter', () => {
  it('names users and falls back to the id', () => {
    expect(nameOf('nora')).toBe('Nora Feld');
    expect(nameOf('system')).toBe('system');
  });
});

describe('views', () => {
  it('keeps snoozed and closed tickets out of the inbox', () => {
    expect(isSnoozed(byId(tickets, 'T-1034'), now)).toBe(true);
    expect(isSnoozed(byId(tickets, 'T-1034'), new Date(now.getTime() + minutes(3 * 24 * 60)))).toBe(
      false
    );
    expect(countByView(tickets, now)).toEqual({ inbox: 10, snoozed: 1, closed: 1, all: 12 });
    expect(inView(byId(tickets, 'T-1032'), 'all', now)).toBe(true);
  });
});

describe('filterTickets', () => {
  it('shows the view', () => {
    expect(filter({ view: 'snoozed' })).toEqual(['T-1034']);
    expect(filter({ view: 'closed' })).toEqual(['T-1032']);
    expect(filter({ view: 'all' })).toHaveLength(12);
  });

  it('searches ids, subjects, customers and tags, ignoring case and spaces', () => {
    expect(filter({ search: ' t-1038 ' })).toEqual(['T-1038']);
    expect(filter({ search: 'CSV' })).toEqual(['T-1040']);
    expect(filter({ search: 'nora' })).toEqual(['T-1042']);
    expect(filter({ search: 'refund' })).toEqual(['T-1036']);
  });

  it('filters by priority and assignee, or unassigned', () => {
    expect(filter({ priority: 'urgent' })).toEqual(['T-1042', 'T-1038']);
    expect(filter({ assigneeId: 'theo' })).toEqual(['T-1041', 'T-1035']);
    expect(filter({ assigneeId: 'unassigned' })).toEqual(['T-1042', 'T-1039', 'T-1033']);
  });
});

describe('sorting', () => {
  it('sorts by priority, age and SLA in both directions', () => {
    const open = filterTickets(tickets, DEFAULT_FILTERS, now, nameOf);
    expect(ids(sortTickets(open, { key: 'priority', direction: 'asc' })).slice(0, 2)).toEqual([
      'T-1042',
      'T-1038',
    ]);
    expect(ids(sortTickets(open, { key: 'age', direction: 'asc' }))[0]).toBe('T-1038');
    expect(ids(sortTickets(open, { key: 'age', direction: 'desc' }))[0]).toBe('T-1036');
    expect(ids(sortTickets(open, { key: 'sla', direction: 'asc' })).slice(0, 3)).toEqual([
      'T-1033',
      'T-1042',
      'T-1038',
    ]);
    expect(ids(open)[0]).toBe('T-1042');
  });

  it('flips the direction of the sorted column; another column starts ascending', () => {
    expect(nextSort({ key: 'sla', direction: 'asc' }, 'sla')).toEqual({
      key: 'sla',
      direction: 'desc',
    });
    expect(nextSort({ key: 'sla', direction: 'desc' }, 'sla').direction).toBe('asc');
    expect(nextSort({ key: 'sla', direction: 'desc' }, 'age')).toEqual({
      key: 'age',
      direction: 'asc',
    });
  });
});

describe('times', () => {
  it('formats durations in minutes, hours and days', () => {
    expect(formatDuration(0)).toBe('1m');
    expect(formatDuration(-minutes(45))).toBe('45m');
    expect(formatDuration(minutes(150))).toBe('3h');
    expect(formatDuration(minutes(3000))).toBe('2d');
    expect(formatAge(byId(tickets, 'T-1039'), now)).toBe('1d');
  });

  it('colours the SLA: overdue, due within the hour, later, and done when closed', () => {
    expect(slaState(byId(tickets, 'T-1042'), now)).toEqual({ label: 'Overdue 20m', color: 'red' });
    expect(slaState(byId(tickets, 'T-1038'), now)).toEqual({ label: '15m left', color: 'orange' });
    expect(slaState(byId(tickets, 'T-1037'), now)).toEqual({ label: '3h left', color: 'teal' });
    expect(slaState(byId(tickets, 'T-1032'), now)).toEqual({ label: 'Done', color: 'dimmed' });
  });

  it('offers snoozing for an hour, until tomorrow and until next Monday at 9:00', () => {
    const [hour, tomorrow, monday] = snoozeOptions(now);
    expect(hour.until).toEqual(new Date(2026, 10, 16, 11, 0));
    expect(tomorrow.until).toEqual(new Date(2026, 10, 17, 9, 0));
    // On a Monday, next Monday is a week away
    expect(monday.until).toEqual(new Date(2026, 10, 23, 9, 0));
    // On a Friday, three days
    expect(snoozeOptions(new Date(2026, 10, 20, 15, 0))[2].until).toEqual(
      new Date(2026, 10, 23, 9, 0)
    );
  });
});

describe('list previews', () => {
  it('previews the newest email, chat message or note, skipping events', () => {
    // An email whose line breaks become spaces, followed by an event
    expect(previewOf(byId(tickets, 'T-1040'))).toBe(
      'Hi Aiko, Thanks for the report, we could reproduce it. A fix is planned for next week; until then, "Export as XLSX" keeps the accents. Priya'
    );
    expect(previewOf(byId(tickets, 'T-1042'))).toBe(
      'Hi, following up on my email about the double charge. Any news?'
    );
    expect(previewOf(byId(tickets, 'T-1033'))).toBe(
      'Note: Same stack trace as BUG-874. Mobile team is on it.'
    );
    expect(previewOf({ ...byId(tickets, 'T-1033'), items: [] })).toBe('');
  });

  it('times the newest message, or the ticket when it has none', () => {
    expect(formatLastActivity(byId(tickets, 'T-1042'), now)).toBe('12m');
    expect(formatLastActivity({ ...byId(tickets, 'T-1042'), items: [] }, now)).toBe('2h');
  });
});

describe('queueReducer', () => {
  const at = new Date(now.getTime() + minutes(1));

  it('assigns and unassigns, logging an event, and skips tickets that already match', () => {
    const maya = agents[1];
    let next = queueReducer(tickets, {
      type: 'assign',
      ids: ['T-1042', 'T-1036'],
      assignee: maya,
      at,
    });
    expect(byId(next, 'T-1042').assigneeId).toBe('maya');
    expect(lastItem(byId(next, 'T-1042'))).toEqual({
      id: 'T-1042-5',
      kind: 'event',
      authorId: 'me',
      text: 'You assigned this to Maya Lindqvist',
      createdAt: at,
    });
    // Already Maya's: unchanged, no event
    expect(byId(next, 'T-1036')).toBe(byId(tickets, 'T-1036'));
    // Not selected: unchanged
    expect(byId(next, 'T-1041')).toBe(byId(tickets, 'T-1041'));

    next = queueReducer(next, { type: 'assign', ids: ['T-1042'], assignee: null, at });
    expect(byId(next, 'T-1042').assigneeId).toBeNull();
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({ text: 'You unassigned this' });
  });

  it('changes status and priority', () => {
    let next = queueReducer(tickets, {
      type: 'setStatus',
      ids: ['T-1042', 'T-1032'],
      status: 'closed',
      at,
    });
    expect(byId(next, 'T-1042').status).toBe('closed');
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: 'You changed the status to Closed',
    });
    expect(byId(next, 'T-1032')).toBe(byId(tickets, 'T-1032'));

    // Both are urgent already: nothing changes
    const closed = next;
    next = queueReducer(next, {
      type: 'setPriority',
      ids: ['T-1042', 'T-1038'],
      priority: 'urgent',
      at,
    });
    expect(next).toEqual(closed);
    next = queueReducer(next, { type: 'setPriority', ids: ['T-1042'], priority: 'low', at });
    expect(byId(next, 'T-1042').priority).toBe('low');
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: 'You changed the priority to Low',
    });
  });

  it('adds a tag once', () => {
    const next = queueReducer(tickets, {
      type: 'addTag',
      ids: ['T-1042', 'T-1041'],
      tag: 'billing',
      at,
    });
    expect(byId(next, 'T-1042')).toBe(byId(tickets, 'T-1042'));
    expect(byId(next, 'T-1041').tags).toEqual(['billing']);
    expect(lastItem(byId(next, 'T-1041'))).toMatchObject({ text: 'You tagged this billing' });
  });

  it('snoozes until a time and unsnoozes', () => {
    const until = new Date(2026, 10, 17, 9, 0);
    let next = queueReducer(tickets, { type: 'snooze', ids: ['T-1042'], until, at });
    expect(byId(next, 'T-1042').snoozedUntil).toBe(until);
    expect(inView(byId(next, 'T-1042'), 'inbox', now)).toBe(false);
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      text: expect.stringContaining('You snoozed this until'),
    });

    next = queueReducer(next, { type: 'snooze', ids: ['T-1042'], until: null, at });
    expect(byId(next, 'T-1042').snoozedUntil).toBeNull();
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({ text: 'You unsnoozed this' });
  });

  it('appends a public reply or an internal note to one ticket', () => {
    let next = queueReducer(tickets, {
      type: 'send',
      id: 'T-1042',
      text: 'Refunded!',
      note: false,
      at,
    });
    expect(lastItem(byId(next, 'T-1042'))).toEqual({
      id: 'T-1042-5',
      authorId: 'me',
      body: 'Refunded!',
      createdAt: at,
      visibility: 'public',
    });
    expect(byId(next, 'T-1041')).toBe(byId(tickets, 'T-1041'));

    next = queueReducer(next, {
      type: 'send',
      id: 'T-1042',
      text: 'Done in Stripe',
      note: true,
      at,
    });
    expect(lastItem(byId(next, 'T-1042'))).toMatchObject({
      id: 'T-1042-6',
      visibility: 'internal',
    });
  });

  it('marks a ticket read without logging anything, and keeps the list when it is read', () => {
    const read = queueReducer(tickets, { type: 'markRead', id: 'T-1042' });
    expect(byId(tickets, 'T-1042').unread).toBe(true);
    expect(byId(read, 'T-1042')).toMatchObject({
      unread: false,
      items: byId(tickets, 'T-1042').items,
    });
    expect(byId(read, 'T-1041')).toBe(byId(tickets, 'T-1041'));
    expect(queueReducer(read, { type: 'markRead', id: 'T-1042' })).toBe(read);
    expect(queueReducer(tickets, { type: 'markRead', id: 'T-1040' })).toBe(tickets);
  });
});

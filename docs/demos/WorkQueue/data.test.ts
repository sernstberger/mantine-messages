import { agents, createTickets, customers, SUPPORT_ADDRESS, users } from './data';
import type { TimelineItem } from './types';

const now = new Date(2026, 10, 16, 10, 0);

const kindOf = (item: TimelineItem) => {
  if ('kind' in item) {
    return item.kind;
  }

  return item.visibility === 'internal' ? 'note' : 'chat';
};

describe('work queue data', () => {
  const tickets = createTickets(now);

  it('has twelve tickets whose timelines together mix all four kinds of item', () => {
    expect(tickets).toHaveLength(12);
    const kinds = new Set(tickets.flatMap((ticket) => ticket.items.map(kindOf)));
    expect([...kinds].sort()).toEqual(['chat', 'email', 'event', 'note']);
  });

  it('numbers items per ticket, oldest first, all in the past', () => {
    for (const ticket of tickets) {
      expect(ticket.items.map((item) => item.id)).toEqual(
        ticket.items.map((_, index) => `${ticket.id}-${index + 1}`)
      );
      const times = ticket.items.map((item) => new Date(item.createdAt).getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(Math.max(...times)).toBeLessThan(now.getTime());
    }
  });

  it('addresses customer emails to support and agent emails to the customer', () => {
    const csv = tickets.find((ticket) => ticket.id === 'T-1040')!;
    const [question, answer] = csv.items.filter((item) => 'kind' in item && item.kind === 'email');
    expect(question).toMatchObject({
      from: { name: 'Aiko Tanaka', address: 'aiko@paperplane.example' },
      to: [SUPPORT_ADDRESS],
    });
    expect(answer).toMatchObject({
      from: { name: 'Priya Raman', address: SUPPORT_ADDRESS },
      to: ['aiko@paperplane.example'],
    });
  });

  it('knows every author, and every customer and assignee', () => {
    const ids = new Set(users.map((user) => user.id));
    expect(users).toHaveLength(agents.length + customers.length);

    for (const ticket of tickets) {
      expect(ids.has(ticket.customerId)).toBe(true);
      expect(ticket.assigneeId === null || ids.has(ticket.assigneeId)).toBe(true);
      ticket.items
        .filter((item) => !('kind' in item && item.kind === 'event'))
        .forEach((item) => expect(ids.has(item.authorId)).toBe(true));
    }
  });

  it('marks a few tickets unread, each one where the customer wrote last', () => {
    const unread = tickets.filter((ticket) => ticket.unread);
    expect(unread.map((ticket) => ticket.id)).toEqual(['T-1042', 'T-1041', 'T-1039', 'T-1038']);

    for (const ticket of unread) {
      const last = ticket.items
        .filter((item) => !('kind' in item && item.kind === 'event'))
        .at(-1)!;
      expect(last.authorId).toBe(ticket.customerId);
    }
  });
});

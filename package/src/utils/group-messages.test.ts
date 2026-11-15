import type { Message } from '../types';
import { groupMessages } from './group-messages';

const message = (id: string, authorId: string, createdAt: string): Message => ({
  id,
  authorId,
  body: id,
  createdAt,
});

describe('groupMessages', () => {
  it('returns nothing for no messages', () => {
    expect(groupMessages([])).toEqual([]);
  });

  it('groups consecutive messages from one author', () => {
    const items = groupMessages([
      message('a', 'maya', '2026-11-15T09:00:00'),
      message('b', 'maya', '2026-11-15T09:01:00'),
      message('c', 'me', '2026-11-15T09:02:00'),
      message('d', 'maya', '2026-11-15T09:03:00'),
    ]);

    expect(items.map((item) => item.type)).toEqual(['divider', 'group', 'group', 'group']);
    expect(items[1]).toMatchObject({ key: 'a', authorId: 'maya' });
    expect(items[1].type === 'group' && items[1].messages.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('starts a new group after a gap longer than the window', () => {
    const items = groupMessages(
      [message('a', 'maya', '2026-11-15T09:00:00'), message('b', 'maya', '2026-11-15T09:10:00')],
      5 * 60 * 1000
    );

    expect(items.filter((item) => item.type === 'group')).toHaveLength(2);
  });

  it('adds a divider for each new day and breaks the group there', () => {
    const items = groupMessages([
      message('a', 'maya', '2026-11-14T23:59:00'),
      message('b', 'maya', '2026-11-15T00:01:00'),
    ]);

    expect(items.map((item) => item.type)).toEqual(['divider', 'group', 'divider', 'group']);
    expect(items[2].type === 'divider' && items[2].date).toEqual(new Date(2026, 10, 15));
  });

  it('accepts Date objects and timestamps', () => {
    const items = groupMessages([
      { id: 'a', authorId: 'me', body: '', createdAt: new Date(2026, 10, 15, 9) },
      { id: 'b', authorId: 'me', body: '', createdAt: new Date(2026, 10, 15, 9, 1).getTime() },
    ]);

    expect(items).toHaveLength(2);
  });
});

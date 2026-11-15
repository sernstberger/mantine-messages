import { useMessagesContext } from 'mantine-messages';
import { useMemo, useReducer, useState } from 'react';
import { agents, createTickets, TAGS, users } from './data';
import {
  countByView,
  DEFAULT_FILTERS,
  filterTickets,
  nameGetter,
  nextSort,
  type QueueAction,
  queueReducer,
  sortTickets,
} from './queue';
import type { Agent, QueueFilters, QueueSort, SortKey } from './types';

const nameOf = nameGetter(users);

/**
 * The work queue's state, shared by the table and the split layouts: tickets and their reducer,
 * filters, sort, the selection and the bulk actions on it
 */
export function useWorkQueue(nowProp?: Date) {
  const settings = useMessagesContext();
  const [now] = useState(() => nowProp ?? new Date(settings.now ?? Date.now()));
  const [tickets, dispatch] = useReducer(queueReducer, now, createTickets);
  const [filters, setFiltersState] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<QueueSort>({ key: 'sla', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visible = useMemo(
    () => sortTickets(filterTickets(tickets, filters, now, nameOf), sort),
    [tickets, filters, now, sort]
  );
  const counts = useMemo(() => countByView(tickets, now), [tickets, now]);

  const bulk = (action: QueueAction) => {
    dispatch(action);
    setSelectedIds([]);
  };
  const at = () => new Date();

  return {
    now,
    tickets,
    dispatch,
    users,
    agents,
    tags: TAGS,

    visible,
    counts,
    filters,

    setFilters: (next: QueueFilters) => {
      setFiltersState(next);
      setSelectedIds([]);
    },
    sort,

    sortBy: (key: SortKey) => setSort((current) => nextSort(current, key)),
    selectedIds,
    setSelectedIds,
    assignSelected: (assignee: Agent | null) =>
      bulk({ type: 'assign', ids: selectedIds, assignee, at: at() }),
    closeSelected: () => bulk({ type: 'setStatus', ids: selectedIds, status: 'closed', at: at() }),
    tagSelected: (tag: string) => bulk({ type: 'addTag', ids: selectedIds, tag, at: at() }),
    clearSelection: () => setSelectedIds([]),
  };
}

export type WorkQueueState = ReturnType<typeof useWorkQueue>;

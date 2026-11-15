import { Box, Paper, ScrollArea } from '@mantine/core';
import React, { useMemo, useReducer, useState } from 'react';
import { BulkActions } from './BulkActions';
import { agents, createTickets, TAGS, users } from './data';
import { QueueFilters } from './QueueFilters';
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
import { TicketView } from './TicketView';
import { TriageTable } from './TriageTable';
import type { QueueFilters as Filters, QueueSort } from './types';

export interface WorkQueueProps {
  /** The clock for ages, SLAs and snoozing, the time of the first render by default */
  now?: Date;

  /** Ticket open at first; the queue shows when it is missing */
  defaultTicketId?: string;

  /** Height of the app, 640 by default */
  h?: number | string;
}

const nameOf = nameGetter(users);

/**
 * A support work queue built from mantine-messages: a triage table, and a ticket with its mixed
 * timeline, a Reply / Internal note composer and actions
 */
export function WorkQueue({ now: nowProp, defaultTicketId, h = 640 }: WorkQueueProps) {
  const [now] = useState(() => nowProp ?? new Date());
  const [tickets, dispatch] = useReducer(queueReducer, now, createTickets);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<QueueSort>({ key: 'sla', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(defaultTicketId ?? null);

  const visible = useMemo(
    () => sortTickets(filterTickets(tickets, filters, now, nameOf), sort),
    [tickets, filters, now, sort]
  );
  const open = tickets.find((ticket) => ticket.id === openId);

  // A bulk action applies to the selection, which then clears
  const bulk = (action: QueueAction) => {
    dispatch(action);
    setSelectedIds([]);
  };
  const at = () => new Date();

  return (
    <Paper
      withBorder
      radius="lg"
      h={h}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {open ? (
        <TicketView
          ticket={open}
          users={users}
          agents={agents}
          now={now}
          dispatch={dispatch}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <Box
            p="sm"
            pos="relative"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            {/* While rows are selected the bar takes the filters' place but not their height, so the rows stay put under the pointer */}
            <Box style={{ visibility: selectedIds.length > 0 ? 'hidden' : undefined }}>
              <QueueFilters
                filters={filters}
                onChange={(next) => {
                  setFilters(next);
                  setSelectedIds([]);
                }}
                agents={agents}
                counts={countByView(tickets, now)}
              />
            </Box>
            {selectedIds.length > 0 && (
              <Box pos="absolute" inset={0}>
                <BulkActions
                  count={selectedIds.length}
                  agents={agents}
                  tags={TAGS}
                  onAssign={(assignee) =>
                    bulk({ type: 'assign', ids: selectedIds, assignee, at: at() })
                  }
                  onClose={() =>
                    bulk({ type: 'setStatus', ids: selectedIds, status: 'closed', at: at() })
                  }
                  onTag={(tag) => bulk({ type: 'addTag', ids: selectedIds, tag, at: at() })}
                  onClear={() => setSelectedIds([])}
                />
              </Box>
            )}
          </Box>
          <ScrollArea style={{ flex: 1 }}>
            <TriageTable
              tickets={visible}
              users={users}
              now={now}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              sort={sort}
              onSort={(key) => setSort((current) => nextSort(current, key))}
              onOpen={setOpenId}
            />
          </ScrollArea>
        </>
      )}
    </Paper>
  );
}

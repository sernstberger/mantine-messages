import { Paper, ScrollArea } from '@mantine/core';
import React, { useState } from 'react';
import { BulkActions } from './BulkActions';
import { QueueFilters } from './QueueFilters';
import { SelectionSwap } from './SelectionSwap';
import { TicketView } from './TicketView';
import { TriageTable } from './TriageTable';
import { useWorkQueue } from './useWorkQueue';

export interface WorkQueueProps {
  /** The clock for ages, SLAs and snoozing, the time of the first render by default */
  now?: Date;

  /** Ticket open at first; the queue shows when it is missing */
  defaultTicketId?: string;

  /** Height of the app, 640 by default */
  h?: number | string;
}

/**
 * A support work queue built from mantine-messages: a triage table, and a ticket with its mixed
 * timeline, a Reply / Internal note composer and actions
 */
export function WorkQueue({ now: nowProp, defaultTicketId, h = 640 }: WorkQueueProps) {
  const queue = useWorkQueue(nowProp);
  const [openId, setOpenId] = useState<string | null>(defaultTicketId ?? null);
  const open = queue.tickets.find((ticket) => ticket.id === openId);

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
          users={queue.users}
          agents={queue.agents}
          now={queue.now}
          dispatch={queue.dispatch}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <SelectionSwap
            active={queue.selectedIds.length > 0}
            bar={
              <BulkActions
                count={queue.selectedIds.length}
                agents={queue.agents}
                tags={queue.tags}
                onAssign={queue.assignSelected}
                onClose={queue.closeSelected}
                onTag={queue.tagSelected}
                onClear={queue.clearSelection}
              />
            }
          >
            <QueueFilters
              filters={queue.filters}
              onChange={queue.setFilters}
              agents={queue.agents}
              counts={queue.counts}
            />
          </SelectionSwap>
          <ScrollArea style={{ flex: 1 }}>
            <TriageTable
              tickets={queue.visible}
              users={queue.users}
              now={queue.now}
              selectedIds={queue.selectedIds}
              onSelectedIdsChange={queue.setSelectedIds}
              sort={queue.sort}
              onSort={queue.sortBy}
              onOpen={setOpenId}
            />
          </ScrollArea>
        </>
      )}
    </Paper>
  );
}

import { Box, EmptyState, ScrollArea } from '@mantine/core';
import { type MessageListHandlers, MessagesShell } from 'mantine-messages';
import React, { useEffect, useRef, useState } from 'react';
import { BulkActions } from './BulkActions';
import { ListToolbar } from './ListToolbar';
import { SelectionSwap } from './SelectionSwap';
import { TicketList } from './TicketList';
import { TicketSidebar } from './TicketSidebar';
import { TicketView } from './TicketView';
import { useWorkQueue } from './useWorkQueue';

export interface WorkQueueSplitProps {
  /** The clock for ages, SLAs and snoozing, the time of the first render by default */
  now?: Date;

  /** Ticket open at first, the first one in the list by default */
  defaultTicketId?: string;

  /** Height of the app, 640 by default */
  h?: number | string;
}

/**
 * The work queue as an email client, on `MessagesShell`: the ticket list, the open ticket's
 * conversation, and its details. Below 960px of width the details open from the ticket header
 */
export function WorkQueueSplit({ now: nowProp, defaultTicketId, h = 640 }: WorkQueueSplitProps) {
  const queue = useWorkQueue(nowProp);
  const { dispatch } = queue;
  const timeline = useRef<MessageListHandlers>(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  // Stays open after leaving the view (closed, snoozed) until another ticket is picked
  const [openId, setOpenId] = useState(() => defaultTicketId ?? queue.visible[0]?.id);
  const open = queue.tickets.find((ticket) => ticket.id === openId);

  useEffect(() => {
    if (open?.unread) {
      dispatch({ type: 'markRead', id: open.id });
    }
  }, [open, dispatch]);

  return (
    <MessagesShell
      withBorder
      radius="lg"
      h={h}
      asideOpened={detailsOpened}
      onAsideOpenedChange={setDetailsOpened}
    >
      <MessagesShell.List w={320} aria-label="Queue">
        <SelectionSwap
          active={queue.selectedIds.length > 0}
          bar={
            <BulkActions
              compact
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
          <ListToolbar
            filters={queue.filters}
            onChange={queue.setFilters}
            agents={queue.agents}
            counts={queue.counts}
            sort={queue.sort}
            onSort={queue.sortBy}
          />
        </SelectionSwap>
        <ScrollArea style={{ flex: 1 }}>
          <TicketList
            tickets={queue.visible}
            users={queue.users}
            now={queue.now}
            openId={openId}
            onOpen={setOpenId}
            selectedIds={queue.selectedIds}
            onSelectedIdsChange={queue.setSelectedIds}
          />
        </ScrollArea>
      </MessagesShell.List>

      <MessagesShell.Main aria-label="Conversation">
        {open ? (
          <TicketView
            key={open.id}
            ticket={open}
            users={queue.users}
            agents={queue.agents}
            now={queue.now}
            dispatch={dispatch}
            handlersRef={timeline}
            withSidebar={false}
            headerSection={<MessagesShell.AsideToggle />}
          />
        ) : (
          <EmptyState m="auto" title="No ticket open" description="Pick a ticket from the list" />
        )}
      </MessagesShell.Main>

      {open && (
        <MessagesShell.Aside w={260} aria-label="Ticket details">
          <Box style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <TicketSidebar
              key={open.id}
              ticket={open}
              agents={queue.agents}
              now={queue.now}
              dispatch={dispatch}
              onJumpTo={(id) => {
                timeline.current!.jumpTo(id);
                // Collapsed details cover the timeline
                setDetailsOpened(false);
              }}
            />
          </Box>
        </MessagesShell.Aside>
      )}
    </MessagesShell>
  );
}

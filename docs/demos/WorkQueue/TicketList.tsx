import { Badge, Checkbox, EmptyState, Group, Text, UnstyledButton } from '@mantine/core';
import type { MessagesUser } from 'mantine-messages';
import React, { useId } from 'react';
import {
  formatLastActivity,
  nameGetter,
  previewOf,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  slaState,
} from './queue';
import classes from './TicketList.module.css';
import type { Ticket } from './types';

export interface TicketListProps {
  /** Filtered and sorted */
  tickets: Ticket[];
  users: MessagesUser[];
  now: Date;

  /** The ticket shown beside the list */
  openId?: string;
  onOpen: (id: string) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

interface RowProps {
  ticket: Ticket;
  now: Date;
  nameOf: (id: string) => string;
  open: boolean;
  checked: boolean;
  onOpen: (id: string) => void;
  onToggleSelected: (id: string) => void;
}

const STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

function moveFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
  const step = STEPS[event.key];

  if (step) {
    event.preventDefault();
    const rows = Array.from(
      event.currentTarget.closest('ul')!.querySelectorAll<HTMLElement>('[data-row]')
    );
    rows[rows.indexOf(event.currentTarget) + step]?.focus();
  }
}

function Row({ ticket, now, nameOf, open, checked, onOpen, onToggleSelected }: RowProps) {
  const detailsId = useId();
  const customer = nameOf(ticket.customerId);
  const sla = slaState(ticket, now);
  const weight = ticket.unread ? 700 : 400;

  return (
    <li className={classes.row} data-open={open || undefined} data-checked={checked || undefined}>
      <Checkbox
        className={classes.check}
        size="xs"
        aria-label={`Select ${ticket.id}`}
        checked={checked}
        onChange={() => onToggleSelected(ticket.id)}
      />
      {ticket.unread && <span className={classes.dot} aria-hidden />}
      <UnstyledButton
        data-row
        className={classes.button}
        aria-current={open || undefined}
        aria-label={`${ticket.subject}, ${customer}${ticket.unread ? ', unread' : ''}`}
        aria-describedby={detailsId}
        onClick={() => onOpen(ticket.id)}
        onKeyDown={moveFocus}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="sm" fw={weight} truncate>
            {customer}
          </Text>
          <Text
            size="xs"
            c={ticket.unread ? undefined : 'dimmed'}
            fw={weight}
            style={{ flexShrink: 0 }}
          >
            {formatLastActivity(ticket, now)}
          </Text>
        </Group>
        <Text size="sm" fw={ticket.unread ? 700 : 500} truncate>
          {ticket.subject}
        </Text>
        <div id={detailsId}>
          <Text size="xs" c="dimmed" truncate>
            {previewOf(ticket)}
          </Text>
          <Group gap={6} mt={4} wrap="nowrap">
            <Badge tt="none" size="xs" variant="light" color={PRIORITY_COLORS[ticket.priority]}>
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
            <Text size="xs" fw={500} c={sla.color}>
              {sla.label}
            </Text>
            <Text size="xs" c="dimmed" truncate ms="auto">
              {ticket.assigneeId ? nameOf(ticket.assigneeId) : 'Unassigned'}
            </Text>
          </Group>
        </div>
      </UnstyledButton>
    </li>
  );
}

/**
 * Tickets as email-client rows: customer and time, subject, a preview of the newest message, then
 * priority, SLA and assignee. A checkbox shows on hover and focus, and on every row while any is
 * selected
 */
export function TicketList({
  tickets,
  users,
  now,
  openId,
  onOpen,
  selectedIds,
  onSelectedIdsChange,
}: TicketListProps) {
  const nameOf = nameGetter(users);
  const selected = new Set(selectedIds);

  if (tickets.length === 0) {
    return (
      <EmptyState
        size="sm"
        py="xl"
        title="No tickets match"
        description="Try another view, or clear the search and filters"
      />
    );
  }

  const toggle = (id: string) =>
    onSelectedIdsChange(
      selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
    );

  return (
    <ul
      className={classes.list}
      aria-label="Tickets"
      data-selecting={selectedIds.length > 0 || undefined}
    >
      {tickets.map((ticket) => (
        <Row
          key={ticket.id}
          ticket={ticket}
          now={now}
          nameOf={nameOf}
          open={ticket.id === openId}
          checked={selected.has(ticket.id)}
          onOpen={onOpen}
          onToggleSelected={toggle}
        />
      ))}
    </ul>
  );
}

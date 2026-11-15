import { Anchor, Avatar, Badge, Checkbox, Group, Table, Text, UnstyledButton } from '@mantine/core';
import type { MessagesUser } from 'mantine-messages';
import React from 'react';
import {
  formatAge,
  nameGetter,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  slaState,
  STATUS_COLORS,
  STATUS_LABELS,
} from './queue';
import type { QueueSort, SortKey, Ticket } from './types';

export interface TriageTableProps {
  /** Filtered and sorted */
  tickets: Ticket[];
  users: MessagesUser[];
  now: Date;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  sort: QueueSort;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
}

const SORT_LABELS: Record<SortKey, string> = { priority: 'Priority', age: 'Age', sla: 'SLA' };

export function TriageTable({
  tickets,
  users,
  now,
  selectedIds,
  onSelectedIdsChange,
  sort,
  onSort,
  onOpen,
}: TriageTableProps) {
  const nameOf = nameGetter(users);
  const selected = new Set(selectedIds);
  const allSelected = tickets.length > 0 && tickets.every((ticket) => selected.has(ticket.id));

  const toggle = (id: string) =>
    onSelectedIdsChange(
      selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
    );

  const sortable = (key: SortKey) => {
    const active = sort.key === key;
    const arrow = sort.direction === 'asc' ? '▲' : '▼';

    return (
      <Table.Th
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <UnstyledButton fz="sm" fw={700} onClick={() => onSort(key)}>
          {SORT_LABELS[key]} {active && <span aria-hidden>{arrow}</span>}
        </UnstyledButton>
      </Table.Th>
    );
  };

  return (
    <Table highlightOnHover stickyHeader verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Checkbox
              aria-label="Select all"
              checked={allSelected}
              indeterminate={!allSelected && tickets.some((ticket) => selected.has(ticket.id))}
              onChange={() => onSelectedIdsChange(allSelected ? [] : tickets.map((t) => t.id))}
            />
          </Table.Th>
          <Table.Th>Ticket</Table.Th>
          <Table.Th>Status</Table.Th>
          {sortable('priority')}
          <Table.Th>Assignee</Table.Th>
          {sortable('age')}
          {sortable('sla')}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {tickets.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={7}>
              <Text c="dimmed" ta="center" py="xl">
                No tickets match
              </Text>
            </Table.Td>
          </Table.Tr>
        )}
        {tickets.map((ticket) => {
          const sla = slaState(ticket, now);

          return (
            <Table.Tr
              key={ticket.id}
              bg={selected.has(ticket.id) ? 'var(--mantine-primary-color-light)' : undefined}
            >
              <Table.Td>
                <Checkbox
                  aria-label={`Select ${ticket.id}`}
                  checked={selected.has(ticket.id)}
                  onChange={() => toggle(ticket.id)}
                />
              </Table.Td>
              <Table.Td>
                <Anchor
                  component="button"
                  type="button"
                  fw={600}
                  fz="sm"
                  onClick={() => onOpen(ticket.id)}
                >
                  {ticket.subject}
                </Anchor>
                <Text size="xs" c="dimmed">
                  {ticket.id} · {nameOf(ticket.customerId)}
                  {ticket.tags.map((tag) => ` · #${tag}`).join('')}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={STATUS_COLORS[ticket.status]}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Badge variant="dot" color={PRIORITY_COLORS[ticket.priority]}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </Table.Td>
              <Table.Td>
                {ticket.assigneeId ? (
                  <Group gap={6} wrap="nowrap">
                    <Avatar size={22} name={nameOf(ticket.assigneeId)} />
                    <Text size="sm">{nameOf(ticket.assigneeId)}</Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    Unassigned
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatAge(ticket, now)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500} c={sla.color}>
                  {sla.label}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

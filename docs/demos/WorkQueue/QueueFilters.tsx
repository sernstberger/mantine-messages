import { Group, SegmentedControl, Select, TextInput } from '@mantine/core';
import React from 'react';
import { PRIORITY_LABELS } from './queue';
import type { Agent, QueueFilters as Filters, QueueView, TicketPriority } from './types';

export interface QueueFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  agents: Agent[];

  /** Tickets in each view, shown in the view switch */
  counts: Record<QueueView, number>;
}

const VIEWS: { value: QueueView; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

export function QueueFilters({ filters, onChange, agents, counts }: QueueFiltersProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <Group gap="sm" wrap="wrap">
      <SegmentedControl
        size="xs"
        aria-label="View"
        value={filters.view}
        onChange={(view) => set({ view: view as QueueView })}
        data={VIEWS.map((view) => ({
          value: view.value,
          label: `${view.label} ${counts[view.value]}`,
        }))}
      />
      <TextInput
        size="xs"
        aria-label="Search tickets"
        placeholder="Search id, subject, customer, tag"
        value={filters.search}
        onChange={(event) => set({ search: event.currentTarget.value })}
        style={{ flex: 1, minWidth: 180 }}
      />
      <Select
        size="xs"
        w={140}
        aria-label="Priority"
        placeholder="Any priority"
        clearable
        data={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
        value={filters.priority}
        onChange={(priority) => set({ priority: priority as TicketPriority | null })}
      />
      <Select
        size="xs"
        w={160}
        aria-label="Assignee"
        placeholder="Anyone"
        clearable
        data={[
          { value: 'unassigned', label: 'Unassigned' },
          ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
        ]}
        value={filters.assigneeId}
        onChange={(assigneeId) => set({ assigneeId })}
      />
    </Group>
  );
}

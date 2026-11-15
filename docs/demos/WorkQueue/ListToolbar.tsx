import {
  Button,
  Group,
  Menu,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import React from 'react';
import { PRIORITY_LABELS, SORT_LABELS } from './queue';
import type { Agent, QueueFilters, QueueSort, QueueView, SortKey, TicketPriority } from './types';

export interface ListToolbarProps {
  filters: QueueFilters;
  onChange: (filters: QueueFilters) => void;
  agents: Agent[];

  /** Tickets in each view, shown in the view switch */
  counts: Record<QueueView, number>;
  sort: QueueSort;
  onSort: (key: SortKey) => void;
}

const VIEWS: { value: QueueView; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const SORT_KEYS: SortKey[] = ['sla', 'priority', 'age'];
const arrow = (sort: QueueSort) => (sort.direction === 'asc' ? '▲' : '▼');

/**
 * The list pane's toolbar, about 300px wide: search, sort and a Filters popover on one line, the
 * view switch with counts under it
 */
export function ListToolbar({ filters, onChange, agents, counts, sort, onSort }: ListToolbarProps) {
  const set = (patch: Partial<QueueFilters>) => onChange({ ...filters, ...patch });
  const active = Number(filters.priority !== null) + Number(filters.assigneeId !== null);
  // Selects inside the popover keep their options in it, so picking one does not close it
  const inside = { withinPortal: false };

  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap">
        <TextInput
          size="xs"
          aria-label="Search tickets"
          placeholder="Search"
          value={filters.search}
          onChange={(event) => set({ search: event.currentTarget.value })}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Menu position="bottom-end">
          <Menu.Target>
            <Button
              size="compact-sm"
              variant="default"
              aria-label={`Sort by ${SORT_LABELS[sort.key]}, ${sort.direction === 'asc' ? 'ascending' : 'descending'}`}
            >
              {SORT_LABELS[sort.key]} {arrow(sort)}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Sort by</Menu.Label>
            {SORT_KEYS.map((key) => (
              <Menu.Item
                key={key}
                onClick={() => onSort(key)}
                rightSection={sort.key === key ? arrow(sort) : null}
              >
                {SORT_LABELS[key]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Popover position="bottom-end" width={220}>
          <Popover.Target>
            <Button size="compact-sm" variant={active ? 'light' : 'default'}>
              {active ? `Filters ${active}` : 'Filters'}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Select
                size="xs"
                label="Priority"
                placeholder="Any priority"
                clearable
                comboboxProps={inside}
                data={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                value={filters.priority}
                onChange={(priority) => set({ priority: priority as TicketPriority | null })}
              />
              <Select
                size="xs"
                label="Assignee"
                placeholder="Anyone"
                clearable
                comboboxProps={inside}
                data={[
                  { value: 'unassigned', label: 'Unassigned' },
                  ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
                ]}
                value={filters.assigneeId}
                onChange={(assigneeId) => set({ assigneeId })}
              />
              <Button
                size="compact-sm"
                variant="subtle"
                disabled={!active}
                onClick={() => set({ priority: null, assigneeId: null })}
              >
                Clear filters
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label="View"
        value={filters.view}
        onChange={(view) => set({ view: view as QueueView })}
        data={VIEWS.map((view) => ({
          value: view.value,
          label: `${view.label} ${counts[view.value]}`,
        }))}
      />
    </Stack>
  );
}

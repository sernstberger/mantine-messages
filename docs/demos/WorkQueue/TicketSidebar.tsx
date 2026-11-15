import {
  Badge,
  Button,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  NavLink,
  TextInput,
} from '@mantine/core';
import { type SystemEvent, useMessagesContext } from 'mantine-messages';
import React, { useState } from 'react';
import {
  formatDateTime,
  isSnoozed,
  PRIORITY_LABELS,
  type QueueAction,
  snoozeOptions,
  STATUS_LABELS,
} from './queue';
import type { Agent, Ticket, TicketPriority, TicketStatus } from './types';

export interface TicketSidebarProps {
  ticket: Ticket;
  agents: Agent[];
  now: Date;
  dispatch: (action: QueueAction) => void;

  /** Scrolls the timeline to an item and flashes it */
  onJumpTo: (id: string) => void;
}

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Assign, status, priority, snooze, tags, and the ticket's activity as links into the timeline */
export function TicketSidebar({ ticket, agents, now, dispatch, onJumpTo }: TicketSidebarProps) {
  const [custom, setCustom] = useState('');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const ids = [ticket.id];
  const { locale, timeZone } = useMessagesContext();
  const at = () => new Date();
  const customDate = custom ? new Date(custom) : null;
  const events = ticket.items.filter(
    (item): item is SystemEvent => 'kind' in item && item.kind === 'event'
  );

  const snooze = (until: Date | null) => {
    dispatch({ type: 'snooze', ids, until, at: at() });
    setSnoozeOpen(false);
  };

  return (
    <Stack gap="sm" p="md" w={260} style={{ overflowY: 'auto' }}>
      <Select
        label="Assignee"
        placeholder="Unassigned"
        clearable
        clearButtonProps={{ 'aria-label': 'Unassign' }}
        data={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
        value={ticket.assigneeId}
        onChange={(id) =>
          dispatch({
            type: 'assign',
            ids,
            assignee: agents.find((agent) => agent.id === id) ?? null,
            at: at(),
          })
        }
      />
      <Select
        label="Status"
        allowDeselect={false}
        data={options(STATUS_LABELS)}
        value={ticket.status}
        onChange={(status) =>
          dispatch({ type: 'setStatus', ids, status: status as TicketStatus, at: at() })
        }
      />
      <Select
        label="Priority"
        allowDeselect={false}
        data={options(PRIORITY_LABELS)}
        value={ticket.priority}
        onChange={(priority) =>
          dispatch({ type: 'setPriority', ids, priority: priority as TicketPriority, at: at() })
        }
      />

      {isSnoozed(ticket, now) ? (
        <Group justify="space-between" gap="xs">
          <Text size="sm">
            Snoozed until {formatDateTime(ticket.snoozedUntil!, { locale, timeZone })}
          </Text>
          <Button size="compact-sm" variant="default" onClick={() => snooze(null)}>
            Unsnooze
          </Button>
        </Group>
      ) : (
        <Popover opened={snoozeOpen} onChange={setSnoozeOpen} position="bottom-start" width={240}>
          <Popover.Target>
            <Button variant="default" size="sm" onClick={() => setSnoozeOpen((o) => !o)}>
              Snooze…
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              {snoozeOptions(now).map((option) => (
                <Button
                  key={option.label}
                  variant="subtle"
                  justify="flex-start"
                  onClick={() => snooze(option.until)}
                >
                  {option.label}
                </Button>
              ))}
              <TextInput
                type="datetime-local"
                label="Until"
                value={custom}
                onChange={(event) => setCustom(event.currentTarget.value)}
              />
              <Button
                disabled={!customDate || customDate <= now}
                onClick={() => snooze(customDate)}
              >
                Snooze until then
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}

      {ticket.tags.length > 0 && (
        <Group gap={4}>
          {ticket.tags.map((tag) => (
            <Badge tt="none" key={tag} variant="light" color="gray">
              #{tag}
            </Badge>
          ))}
        </Group>
      )}

      <Text size="sm" fw={600} mt="sm">
        Activity
      </Text>
      <div>
        {events.map((event) => (
          <NavLink
            key={event.id}
            component="button"
            label={event.text}
            description={formatDateTime(new Date(event.createdAt), { locale, timeZone })}
            onClick={() => onJumpTo(event.id)}
            styles={{ root: { borderRadius: 'var(--mantine-radius-sm)' } }}
          />
        ))}
      </div>
    </Stack>
  );
}

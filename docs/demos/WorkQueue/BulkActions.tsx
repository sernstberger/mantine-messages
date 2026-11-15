import { Button, CloseButton, Group, Menu, Text } from '@mantine/core';
import React from 'react';
import type { Agent } from './types';

export interface BulkActionsProps {
  count: number;
  agents: Agent[];
  tags: string[];
  onAssign: (agent: Agent | null) => void;
  onClose: () => void;
  onTag: (tag: string) => void;
  onClear: () => void;

  /** Short labels and an icon to clear, to fit a narrow pane */
  compact?: boolean;
}

/** Shown while tickets are selected: assign, close or tag them all at once */
export function BulkActions({
  count,
  agents,
  tags,
  onAssign,
  onClose,
  onTag,
  onClear,
  compact,
}: BulkActionsProps) {
  return (
    <Group gap="xs" px="sm" py={6} h="100%" bg="var(--mantine-primary-color-light)">
      <Text size="sm" fw={600} me="auto">
        {count} selected
      </Text>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button size="compact-sm" variant="default">
            Assign
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {agents.map((agent) => (
            <Menu.Item key={agent.id} onClick={() => onAssign(agent)}>
              {agent.name}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item onClick={() => onAssign(null)}>Unassigned</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button size="compact-sm" variant="default">
            Tag
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {tags.map((tag) => (
            <Menu.Item key={tag} onClick={() => onTag(tag)}>
              #{tag}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Button size="compact-sm" variant="default" onClick={onClose}>
        {compact ? 'Close' : 'Close tickets'}
      </Button>
      {compact ? (
        <CloseButton size="sm" aria-label="Clear selection" onClick={onClear} />
      ) : (
        <Button size="compact-sm" variant="subtle" onClick={onClear}>
          Clear selection
        </Button>
      )}
    </Group>
  );
}

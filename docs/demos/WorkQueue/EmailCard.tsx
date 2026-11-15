import { Anchor, Group, Paper, Text } from '@mantine/core';
import { truncate } from 'mantine-messages';
import React from 'react';
import type { EmailItem } from './types';

export interface EmailCardProps {
  email: EmailItem;
  time: string;
  onOpen: (email: EmailItem) => void;
}

/** An email in the timeline: who it is from and to, the subject and the start of the text */
export function EmailCard({ email, time, onOpen }: EmailCardProps) {
  return (
    <Paper withBorder radius="md" p="sm" maw={560}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" truncate>
          <Text component="span" inherit fw={700}>
            {email.from.name}
          </Text>{' '}
          <Text component="span" inherit c="dimmed">
            &lt;{email.from.address}&gt;
          </Text>
        </Text>
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          Email · {time}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" truncate>
        To: {email.to.join(', ')}
      </Text>
      <Anchor
        component="button"
        type="button"
        fw={600}
        fz="sm"
        mt={6}
        ta="left"
        aria-label={`Open email: ${email.subject}`}
        onClick={() => onOpen(email)}
      >
        {email.subject}
      </Anchor>
      <Text size="sm" c="dimmed" lineClamp={2}>
        {truncate(email.text.replace(/\s+/g, ' '), 200)}
      </Text>
    </Paper>
  );
}

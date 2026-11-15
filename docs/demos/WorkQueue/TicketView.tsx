import { Badge, Box, Button, Group, Text } from '@mantine/core';
import {
  Composer,
  type ComposerDraft,
  type ComposerMode,
  type MessageListControl,
  type MessagesUser,
} from 'mantine-messages';
import React, { useRef, useState } from 'react';
import { EmailModal } from './EmailModal';
import { nameGetter, type QueueAction, STATUS_COLORS, STATUS_LABELS } from './queue';
import { TicketSidebar } from './TicketSidebar';
import { TicketTimeline } from './TicketTimeline';
import type { Agent, EmailItem, Ticket } from './types';

export interface TicketViewProps {
  ticket: Ticket;
  users: MessagesUser[];
  agents: Agent[];
  now: Date;
  dispatch: (action: QueueAction) => void;

  /** Shows "← Queue" in the header */
  onBack?: () => void;

  /** The timeline's control, for a sidebar the layout draws elsewhere; one of its own by default */
  controlRef?: React.RefObject<MessageListControl | null>;

  /** Draws the sidebar beside the timeline, true by default */
  withSidebar?: boolean;

  /** At the end of the header, for example a toggle for details drawn elsewhere */
  headerSection?: React.ReactNode;
}

const MODES: ComposerMode[] = [
  { value: 'reply', label: 'Reply', placeholder: 'Reply to the customer' },
  {
    value: 'note',
    label: 'Internal note',
    color: 'yellow',
    note: true,
    placeholder: 'Only your team sees notes',
  },
];

/** One ticket: its timeline and composer, with the actions beside them */
export function TicketView({
  ticket,
  users,
  agents,
  now,
  dispatch,
  onBack,
  controlRef,
  withSidebar = true,
  headerSection,
}: TicketViewProps) {
  const ownTimeline = useRef<MessageListControl>(null);
  const timeline = controlRef ?? ownTimeline;
  const [email, setEmail] = useState<EmailItem | null>(null);
  const nameOf = nameGetter(users);

  const send = ({ text, mode }: ComposerDraft) =>
    dispatch({ type: 'send', id: ticket.id, text, note: mode === 'note', at: new Date() });

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Group
        gap="sm"
        px="md"
        py="xs"
        wrap="nowrap"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        {onBack && (
          <Button variant="subtle" size="compact-sm" onClick={onBack}>
            ← Queue
          </Button>
        )}
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700} truncate>
            {ticket.subject}
          </Text>
          <Text size="xs" c="dimmed">
            {ticket.id} · {nameOf(ticket.customerId)}
          </Text>
        </Box>
        <Badge variant="light" color={STATUS_COLORS[ticket.status]}>
          {STATUS_LABELS[ticket.status]}
        </Badge>
        {headerSection}
      </Group>
      <Box style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <TicketTimeline
            items={ticket.items}
            users={users}
            controlRef={timeline}
            onOpenEmail={setEmail}
          />
          <Composer m="sm" modes={MODES} onSend={send} />
        </Box>
        {withSidebar && (
          <Box
            style={{ borderLeft: '1px solid var(--mantine-color-default-border)', display: 'flex' }}
          >
            <TicketSidebar
              ticket={ticket}
              agents={agents}
              now={now}
              dispatch={dispatch}
              onJumpTo={(id) => timeline.current!.jumpTo(id)}
            />
          </Box>
        )}
      </Box>
      <EmailModal email={email} onClose={() => setEmail(null)} />
    </Box>
  );
}

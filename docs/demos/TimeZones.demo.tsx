import { Paper, SegmentedControl, Stack } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { ChatThread, Inbox, MessagesProvider } from 'mantine-messages';
import React, { useState } from 'react';
import { conversations, DEMO_NOW, messages, users } from './data';

const code = `
import { useState } from 'react';
import { Paper, SegmentedControl, Stack } from '@mantine/core';
import { ChatThread, Inbox, MessagesProvider } from 'mantine-messages';
import { conversations, messages, users } from './data';

const now = new Date('2026-11-15T15:30:00Z');

function Demo() {
  const [timeZone, setTimeZone] = useState('UTC');

  return (
    <MessagesProvider settings={{ timeZone, now }}>
      <Stack>
        <SegmentedControl
          value={timeZone}
          onChange={setTimeZone}
          data={['UTC', 'America/New_York', 'Asia/Tokyo']}
        />
        <Paper withBorder h={180}>
          <Inbox conversations={conversations.slice(0, 3)} />
        </Paper>
        <Paper withBorder h={320} style={{ display: 'flex', flexDirection: 'column' }}>
          <ChatThread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        </Paper>
      </Stack>
    </MessagesProvider>
  );
}
`;

function Demo() {
  const [timeZone, setTimeZone] = useState('UTC');

  return (
    <MessagesProvider settings={{ timeZone, now: DEMO_NOW }}>
      <Stack>
        <SegmentedControl
          value={timeZone}
          onChange={setTimeZone}
          data={['UTC', 'America/New_York', 'Asia/Tokyo']}
        />
        <Paper withBorder h={180}>
          <Inbox conversations={conversations.slice(0, 3)} />
        </Paper>
        <Paper withBorder h={320} style={{ display: 'flex', flexDirection: 'column' }}>
          <ChatThread messages={messages} users={users} currentUserId="me" style={{ flex: 1 }} />
        </Paper>
      </Stack>
    </MessagesProvider>
  );
}

export const timeZones: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

import { Paper, SegmentedControl, Stack } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { ChatThread, Composer } from 'mantine-messages';
import React, { useState } from 'react';
import { messages, users } from './data';

const code = `
import { useState } from 'react';
import { Paper, SegmentedControl, Stack } from '@mantine/core';
import { ChatThread, Composer } from 'mantine-messages';
import { messages, users } from './data';

function Demo() {
  const [color, setColor] = useState('teal');
  const [radius, setRadius] = useState('md');

  return (
    <Stack>
      <SegmentedControl value={color} onChange={setColor} data={['blue', 'teal', 'grape']} />
      <SegmentedControl value={radius} onChange={setRadius} data={['xs', 'md', 'xl']} />
      <Paper withBorder radius={radius} h={380} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={users}
          currentUserId="me"
          color={color}
          radius={radius}
          avatarSize="md"
          style={{ flex: 1 }}
        />
        <Composer radius={radius} m="sm" onSend={() => {}} />
      </Paper>
    </Stack>
  );
}
`;

function Demo() {
  const [color, setColor] = useState('teal');
  const [radius, setRadius] = useState('md');

  return (
    <Stack>
      <SegmentedControl value={color} onChange={setColor} data={['blue', 'teal', 'grape']} />
      <SegmentedControl value={radius} onChange={setRadius} data={['xs', 'md', 'xl']} />
      <Paper
        withBorder
        radius={radius}
        h={380}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <ChatThread
          messages={messages}
          users={users}
          currentUserId="me"
          color={color}
          radius={radius}
          avatarSize="md"
          style={{ flex: 1 }}
        />
        <Composer radius={radius} m="sm" onSend={() => {}} />
      </Paper>
    </Stack>
  );
}

export const theming: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

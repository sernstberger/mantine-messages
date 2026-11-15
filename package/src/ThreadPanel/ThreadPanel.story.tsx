import { Box, Paper } from '@mantine/core';
import React from 'react';
import { Composer } from '../Composer/Composer';
import { sampleTeamItems, sampleUsers } from '../sample-data';
import type { ChatMessage } from '../types';
import { ThreadPanel } from './ThreadPanel';

export default { title: 'ThreadPanel' };

const messages = sampleTeamItems.filter((item): item is ChatMessage => !('kind' in item));
const parent = messages.find((message) => message.thread) ?? messages[0];
const replies = messages.filter((message) => message.threadId === parent.id);

export function Usage() {
  return (
    <Box p="xl" maw={400}>
      <Paper withBorder radius="lg" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <ThreadPanel style={{ flex: 1 }} subtitle="#launch" onClose={() => {}}>
          <ThreadPanel.Replies
            parent={parent}
            replies={replies}
            users={sampleUsers}
            currentUserId="me"
          />
          <ThreadPanel.Footer>
            <Composer placeholder="Reply…" />
          </ThreadPanel.Footer>
        </ThreadPanel>
      </Paper>
    </Box>
  );
}

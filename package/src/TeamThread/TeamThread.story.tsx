import { Badge, Box, Paper } from '@mantine/core';
import React from 'react';
import { sampleTeamItems, sampleUsers } from '../sample-data';
import { TeamThread } from './TeamThread';
import { MarkdownBody } from '../MarkdownBody/MarkdownBody';
import { MarkdownAdapterProvider } from '../MarkdownBody/MarkdownAdapterProvider';
import { markdownAdapter } from '../../../.storybook/markdown-adapter';

export default {
  title: 'TeamThread',
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

export function Usage() {
  const items = sampleTeamItems.filter((item) => 'kind' in item || !item.threadId);

  return (
    <Box p="xl" maw={640}>
      <Paper withBorder radius="md" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <TeamThread
          items={items}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          onReact={() => {}}
          onOpenThread={() => {}}
        />
      </Paper>
    </Box>
  );
}

/** renderMessage with the parts: a Pinned badge, markdown for markdown messages, and react and copy only */
export function Composition() {
  const items = sampleTeamItems.filter((item) => 'kind' in item || !item.threadId);

  return (
    <Box p="xl" maw={640}>
      <Paper withBorder radius="md" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <TeamThread
          items={items}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          onReact={() => {}}
          onOpenThread={() => {}}
          renderMessage={(item, context) =>
            'kind' in item ? (
              <TeamThread.Event event={item} />
            ) : (
              <TeamThread.Message
                message={item}
                context={context}
                rightSection={<TeamThread.Actions actions={['react', 'copy']} />}
              >
                <TeamThread.Author />
                {item.id === 'team-m1' && (
                  <Badge size="xs" variant="light" mb={4}>
                    Pinned
                  </Badge>
                )}
                <TeamThread.Text>
                  {item.format === 'markdown' ? (
                    <MarkdownBody>{item.body}</MarkdownBody>
                  ) : (
                    item.body
                  )}
                </TeamThread.Text>
                <TeamThread.Attachments />
                <TeamThread.Reactions />
                <TeamThread.ThreadSummary />
              </TeamThread.Message>
            )
          }
        />
      </Paper>
    </Box>
  );
}

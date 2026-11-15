import { Button, Paper, Stack } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChatThread,
  MessageList,
  type ChatMessage,
  type MessageListHandlers,
  type MessageListRowsProps,
} from 'mantine-messages';
import React, { useImperativeHandle, useRef } from 'react';
import { DEMO_NOW, messages as sample, users } from './data';

const code = `
import { useImperativeHandle, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button, Paper, Stack } from '@mantine/core';
import {
  ChatThread,
  MessageList,
  type ChatMessage,
  type MessageListHandlers,
  type MessageListRowsProps,
} from 'mantine-messages';
import { DEMO_NOW, messages as sample, users } from './data';

const ROW_ESTIMATE = 64;

// Renders only the rows in view; tanstack measures each row as it mounts
function WindowedRows({ rows, viewportRef, handlersRef }: MessageListRowsProps) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => rows[index].key,
    initialOffset: () => rows.length * ROW_ESTIMATE,
    overscan: 6,
  });

  // Lets jumpTo reach a message that is not rendered
  useImperativeHandle(handlersRef, () => ({
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: 'center' }),
  }));

  return (
    <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <MessageList.Row
          key={virtualRow.key}
          row={rows[virtualRow.index]}
          ref={virtualizer.measureElement}
          data-index={virtualRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: \`translateY(\${virtualRow.start}px)\`,
          }}
        />
      ))}
    </div>
  );
}

const messages: ChatMessage[] = Array.from({ length: 10_000 }, (_, index) => ({
  ...sample[index % sample.length],
  id: \`m-\${index + 1}\`,
  authorId: index % 3 === 0 ? 'me' : 'maya',
  createdAt: new Date(DEMO_NOW.getTime() - (10_000 - index) * 37 * 60 * 1000),
}));

function Demo() {
  const handlers = useRef<MessageListHandlers>(null);

  return (
    <Stack>
      <Button variant="default" onClick={() => handlers.current?.jumpTo('m-1')}>
        Jump to the first message
      </Button>
      <Paper withBorder h={420} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={users}
          currentUserId="me"
          handlersRef={handlers}
          rowsComponent={WindowedRows}
          style={{ flex: 1 }}
        />
      </Paper>
    </Stack>
  );
}
`;

const ROW_ESTIMATE = 64;

function WindowedRows({ rows, viewportRef, handlersRef }: MessageListRowsProps) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => rows[index].key,
    initialOffset: () => rows.length * ROW_ESTIMATE,
    overscan: 6,
  });

  useImperativeHandle(handlersRef, () => ({
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: 'center' }),
  }));

  return (
    <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <MessageList.Row
          key={virtualRow.key}
          row={rows[virtualRow.index]}
          ref={virtualizer.measureElement}
          data-index={virtualRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }}
        />
      ))}
    </div>
  );
}

const messages: ChatMessage[] = Array.from({ length: 10_000 }, (_, index) => ({
  ...sample[index % sample.length],
  id: `m-${index + 1}`,
  authorId: index % 3 === 0 ? 'me' : 'maya',
  createdAt: new Date(DEMO_NOW.getTime() - (10_000 - index) * 37 * 60 * 1000),
}));

function Demo() {
  const handlers = useRef<MessageListHandlers>(null);

  return (
    <Stack>
      <Button variant="default" onClick={() => handlers.current?.jumpTo('m-1')}>
        Jump to the first message
      </Button>
      <Paper withBorder h={420} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={users}
          currentUserId="me"
          handlersRef={handlers}
          rowsComponent={WindowedRows}
          style={{ flex: 1 }}
        />
      </Paper>
    </Stack>
  );
}

export const longThread: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

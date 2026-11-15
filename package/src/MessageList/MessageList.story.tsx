import { Button, Group, Paper, Text } from '@mantine/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useImperativeHandle, useRef, useState } from 'react';
import { ChatThread } from '../ChatThread/ChatThread';
import { Composer } from '../Composer/Composer';
import { sampleMessages, sampleUsers } from '../sample-data';
import type { ChatMessage } from '../types';
import { MessageList, type MessageListHandlers, type MessageListRowsProps } from './MessageList';

export default { title: 'MessageList' };

const renderItem = (item: ChatMessage) => (
  <Text size="sm" px="md" py={4}>
    {item.body}
  </Text>
);

export function Usage() {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <Paper withBorder radius="lg" h={420} style={{ display: 'flex', flexDirection: 'column' }}>
        <MessageList items={sampleMessages} renderItem={renderItem} style={{ flex: 1 }} />
      </Paper>
    </div>
  );
}

const ROW_ESTIMATE = 64;

/** Renders only the rows in view, with @tanstack/react-virtual measuring each row */
function WindowedRows({ rows, viewportRef, handlersRef }: MessageListRowsProps) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => rows[index].key,
    // Start at the end, where the list opens, not at the top
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

const TOTAL = 10_500;
const PAGE = 500;
const MINUTE = 60 * 1000;
const opened = Date.now();

const tenThousand: ChatMessage[] = Array.from({ length: TOTAL }, (_, index) => {
  const sample = sampleMessages[index % sampleMessages.length];
  return {
    ...sample,
    id: `m-${index + 1}`,
    replyToId: sample.replyToId && `m-${index}`,
    authorId: index % 3 === 0 ? 'me' : 'maya',
    body: `${index + 1}. ${sample.body}`,
    createdAt: new Date(opened - (TOTAL - index) * 37 * MINUTE),
  };
});

function TenThousand({ windowed }: { windowed: boolean }) {
  const [loaded, setLoaded] = useState(TOTAL - PAGE);
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const handlers = useRef<MessageListHandlers>(null);
  const messages = [...tenThousand.slice(TOTAL - loaded), ...extra];

  const loadOlder = () => {
    setLoading(true);
    setTimeout(() => {
      setLoaded((current) => Math.min(current + PAGE, TOTAL));
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: 40, maxWidth: 520 }}>
      <Group mb="sm" gap="xs">
        <Button size="xs" variant="default" onClick={() => handlers.current?.jumpTo('m-1501')}>
          Jump to message 1501
        </Button>
        <Text size="xs" c="dimmed">
          {messages.length.toLocaleString('en-US')} messages
        </Text>
      </Group>
      <Paper withBorder radius="lg" h={600} style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatThread
          messages={messages}
          users={sampleUsers}
          currentUserId="me"
          style={{ flex: 1 }}
          handlersRef={handlers}
          rowsComponent={windowed ? WindowedRows : undefined}
          unreadAfterId="m-10490"
          onLoadOlder={loadOlder}
          hasOlder={loaded < TOTAL}
          loadingOlder={loading}
        />
        <Composer
          m="sm"
          onSend={({ text: body }) =>
            setExtra((current) => [
              ...current,
              { id: `new-${current.length}`, authorId: 'me', body, createdAt: new Date() },
            ])
          }
        />
      </Paper>
    </div>
  );
}

/**
 * 10,000 messages loaded and 500 older ones (scroll to the top to load them), windowed with
 * @tanstack/react-virtual: only the rows in view are rendered
 */
export function Windowed() {
  return <TenThousand windowed />;
}

/** The same thread with every row rendered, to compare */
export function NotWindowed() {
  return <TenThousand windowed={false} />;
}
NotWindowed.tags = ['no-smoke'];

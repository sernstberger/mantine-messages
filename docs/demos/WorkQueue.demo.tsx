import { MantineDemo } from '@mantinex/demo';
import React from 'react';
import { WorkQueue } from './WorkQueue/WorkQueue';

const code = `
// Full source: https://github.com/sernstberger/mantine-messages/tree/main/docs/demos/WorkQueue
import { useRef } from 'react';
import { Composer, MessageList, type MessageListHandlers } from 'mantine-messages';

type TimelineItem = EmailItem | ChatMessage | SystemEvent;

function Ticket({ ticket }: { ticket: Ticket }) {
  const timeline = useRef<MessageListHandlers>(null);

  return (
    <>
      <MessageList<TimelineItem>
        items={ticket.items}
        handlersRef={timeline}
        renderItem={(item, { highlighted }) =>
          !('kind' in item) ? <ChatRow message={item} highlighted={highlighted} />
          : item.kind === 'email' ? <EmailCard email={item} onOpen={setOpenEmail} />
          : <EventLine event={item} />
        }
      />
      <Composer
        modes={[
          { value: 'reply', label: 'Reply' },
          { value: 'note', label: 'Internal note', color: 'yellow', note: true },
        ]}
        onSend={({ text, mode }) => send(ticket.id, text, mode === 'note')}
      />
      <ActivityList ticket={ticket} onJumpTo={(id) => timeline.current?.jumpTo(id)} />
    </>
  );
}
`;

function Demo() {
  return <WorkQueue h={640} />;
}

export const workQueue: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

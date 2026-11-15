import { MantineDemo } from '@mantinex/demo';
import React from 'react';
import { WorkQueueSplit } from './WorkQueue/WorkQueueSplit';

const code = `
// Full source: https://github.com/sernstberger/mantine-messages/tree/main/docs/demos/WorkQueue
import { useRef, useState } from 'react';
import { MessagesShell, type MessageListHandlers } from 'mantine-messages';

function WorkQueueSplit() {
  const queue = useWorkQueue();
  const timeline = useRef<MessageListHandlers>(null);
  const [openId, setOpenId] = useState(() => queue.visible[0]?.id);
  const open = queue.tickets.find((ticket) => ticket.id === openId);

  return (
    <MessagesShell withBorder radius="lg" h={640}>
      <MessagesShell.List w={320} aria-label="Queue">
        <ListToolbar filters={queue.filters} onChange={queue.setFilters} sort={queue.sort} />
        <TicketList tickets={queue.visible} openId={openId} onOpen={setOpenId} />
      </MessagesShell.List>
      <MessagesShell.Main aria-label="Conversation">
        <TicketView
          ticket={open}
          handlersRef={timeline}
          withSidebar={false}
          headerSection={<MessagesShell.AsideToggle />}
        />
      </MessagesShell.Main>
      <MessagesShell.Aside w={260} aria-label="Ticket details">
        <TicketSidebar ticket={open} onJumpTo={(id) => timeline.current?.jumpTo(id)} />
      </MessagesShell.Aside>
    </MessagesShell>
  );
}
`;

function Demo() {
  return <WorkQueueSplit h={640} />;
}

export const workQueueSplit: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

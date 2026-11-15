import { MantineProvider } from '@mantine/core';
import { act } from '@testing-library/react';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { renderToString as RenderToString } from 'react-dom/server';
import { ChatThread } from '../ChatThread/ChatThread';
import { Inbox } from '../Inbox/Inbox';
import { TeamThread } from '../TeamThread/TeamThread';
import type { ChatMessage, Conversation, MessagesUser } from '../types';
import { MessagesProvider, MessagesProviderSettings } from './MessagesProvider';

// The browser build of react-dom/server needs MessageChannel, which jsdom does not have
const {
  renderToString,
}: { renderToString: typeof RenderToString } = require('react-dom/server.node');

const serverNow = Date.UTC(2026, 10, 15, 12);
const users: MessagesUser[] = [
  { id: 'me', name: 'Me' },
  { id: 'maya', name: 'Maya Lopez' },
];
const messages: ChatMessage[] = [
  { id: 'a', authorId: 'maya', createdAt: Date.UTC(2026, 10, 13, 23, 50), body: 'Late' },
  {
    id: 'b',
    authorId: 'maya',
    createdAt: Date.UTC(2026, 10, 15, 2, 30),
    body: 'Early',
    thread: { count: 1, lastReplyAt: serverNow - 7 * 60 * 1000, participantIds: ['me'] },
  },
  { id: 'c', authorId: 'me', createdAt: Date.UTC(2026, 10, 15, 11, 59), body: 'Now' },
];
const conversations: Conversation[] = [
  { id: 'x', title: 'Maya Lopez', lastMessage: messages[2] },
  { id: 'y', title: 'Launch', lastMessage: messages[0] },
];

const App = ({ settings }: { settings: MessagesProviderSettings }) => (
  <MantineProvider>
    <MessagesProvider settings={settings}>
      <Inbox conversations={conversations} />
      <ChatThread messages={messages} users={users} currentUserId="me" />
      <TeamThread items={messages} users={users} currentUserId="me" />
    </MessagesProvider>
  </MantineProvider>
);

async function hydrate(server: MessagesProviderSettings, client: MessagesProviderSettings) {
  const container = document.createElement('div');
  container.innerHTML = renderToString(<App settings={server} />);
  document.body.appendChild(container);
  const onRecoverableError = jest.fn();
  await act(async () => {
    hydrateRoot(container, <App settings={client} />, { onRecoverableError });
  });
  container.remove();
  return onRecoverableError;
}

describe('server rendering', () => {
  it('hydrates without a mismatch when the server and the browser share settings', async () => {
    const settings = { locale: 'en-US', timeZone: 'America/New_York', now: serverNow };
    const onRecoverableError = await hydrate(settings, { ...settings });
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it('mismatches when the browser formats in another time zone', async () => {
    const onRecoverableError = await hydrate(
      { timeZone: 'UTC', now: serverNow },
      { timeZone: 'Asia/Tokyo', now: serverNow }
    );
    expect(onRecoverableError).toHaveBeenCalled();
  });
});

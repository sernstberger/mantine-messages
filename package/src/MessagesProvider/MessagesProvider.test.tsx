import { MantineProvider } from '@mantine/core';
import { render, renderHook, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { Attachments } from '../Attachments/Attachments';
import { ChatThread } from '../ChatThread/ChatThread';
import { Inbox } from '../Inbox/Inbox';
import { MessageList } from '../MessageList/MessageList';
import { TeamThread } from '../TeamThread/TeamThread';
import type { ChatMessage, MessageBase, MessagesUser } from '../types';
import {
  MESSAGES_PROVIDER_DEFAULT_SETTINGS,
  MessagesProvider,
  MessagesProviderContext,
  MessagesProviderSettings,
} from './MessagesProvider';
import { useMessagesContext } from './use-messages-context';

const NEW_YORK = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
const now = Date.UTC(2026, 10, 15, 12);
const lateNight = Date.UTC(2026, 10, 15, 2, 30);
const morning = Date.UTC(2026, 10, 15, 9);

const users: MessagesUser[] = [
  { id: 'me', name: 'Me' },
  { id: 'maya', name: 'Maya Lopez' },
];

const message = (id: string, createdAt: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  authorId: 'maya',
  createdAt,
  body: `message ${id}`,
  ...extra,
});

const wrapper =
  (settings?: MessagesProviderSettings) =>
  ({ children }: { children: React.ReactNode }) => (
    <MantineProvider>
      {settings ? <MessagesProvider settings={settings}>{children}</MessagesProvider> : children}
    </MantineProvider>
  );

const dividers = () =>
  screen.queryAllByRole('separator').map((divider) => divider.textContent ?? '');

const renderList = (items: MessageBase[], settings?: MessagesProviderSettings, timeZone?: string) =>
  render(
    <MessageList items={items} timeZone={timeZone} renderItem={(item) => <span>{item.id}</span>} />,
    { wrapper: wrapper(settings) }
  );

describe('MessagesProvider', () => {
  it('keeps the context value while locale, time zone and now are unchanged', () => {
    const { result, rerender } = renderHook(() => useContext(MessagesProviderContext), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MessagesProvider settings={{ locale: 'de' }}>{children}</MessagesProvider>
      ),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('gives the defaults without a provider', () => {
    const { result } = renderHook(() => useMessagesContext());
    expect(result.current).toMatchObject(MESSAGES_PROVIDER_DEFAULT_SETTINGS);
    expect(result.current.getLocale()).toBe('en');
    expect(result.current.getTimeZone()).toBeUndefined();
  });

  it('merges settings over the defaults, and props win over settings', () => {
    const { result } = renderHook(() => useMessagesContext(), {
      wrapper: wrapper({ timeZone: TOKYO, now }),
    });
    expect(result.current.locale).toBe('en');
    expect(result.current.now).toBe(now);
    expect(result.current.getTimeZone()).toBe(TOKYO);
    expect(result.current.getTimeZone(NEW_YORK)).toBe(NEW_YORK);
    expect(result.current.getLocale('de-DE')).toBe('de-DE');
  });

  it('starts date dividers at midnight in the time zone', () => {
    const items = [message('a', lateNight), message('b', morning)];

    renderList(items, { timeZone: 'UTC', now });
    expect(dividers()).toEqual(['Today']);
  });

  it('splits the same messages into two days in New York', () => {
    const items = [message('a', lateNight), message('b', morning)];

    renderList(items, { timeZone: NEW_YORK, now });
    expect(dividers()).toEqual(['Yesterday', 'Today']);
  });

  it('lets the timeZone prop win over the provider', () => {
    const items = [message('a', lateNight), message('b', morning)];

    renderList(items, { timeZone: 'UTC', now }, NEW_YORK);
    expect(dividers()).toEqual(['Yesterday', 'Today']);
  });

  it('shows ChatThread times in the time zone', () => {
    render(<ChatThread messages={[message('a', lateNight)]} users={users} currentUserId="me" />, {
      wrapper: wrapper({ timeZone: TOKYO, now }),
    });
    expect(screen.getAllByText('11:30 AM').length).toBeGreaterThan(0);
    expect(dividers()).toEqual(['Today']);
  });

  it('lets ChatThread props win over the provider', () => {
    render(
      <ChatThread
        messages={[message('a', lateNight)]}
        users={users}
        currentUserId="me"
        timeZone={NEW_YORK}
        locale="de-DE"
      />,
      { wrapper: wrapper({ timeZone: TOKYO, now }) }
    );
    expect(screen.getAllByText('21:30').length).toBeGreaterThan(0);
    expect(dividers()).toEqual(['Gestern']);
  });

  it('shows TeamThread times and relative thread replies from a fixed now', () => {
    render(
      <TeamThread
        items={[
          message('a', lateNight, {
            thread: { count: 2, lastReplyAt: now - 5 * 60 * 1000, participantIds: ['maya'] },
          }),
        ]}
        users={users}
        currentUserId="me"
      />,
      { wrapper: wrapper({ timeZone: NEW_YORK, now }) }
    );
    expect(screen.getAllByText('9:30 PM').length).toBeGreaterThan(0);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    expect(dividers()).toEqual(['Yesterday']);
  });

  it('shows Inbox times in the time zone', () => {
    render(
      <Inbox
        conversations={[
          {
            id: 'c',
            title: 'Maya Lopez',
            lastMessage: { body: 'Hi', authorId: 'maya', createdAt: lateNight },
          },
        ]}
      />,
      { wrapper: wrapper({ timeZone: TOKYO, now }) }
    );
    expect(screen.getByText('11:30 AM')).toBeInTheDocument();
  });

  it('lets the Inbox timeZone prop win over the provider', () => {
    render(
      <Inbox
        timeZone={NEW_YORK}
        conversations={[
          {
            id: 'c',
            title: 'Maya Lopez',
            lastMessage: { body: 'Hi', authorId: 'maya', createdAt: lateNight },
          },
        ]}
      />,
      { wrapper: wrapper({ timeZone: TOKYO, now }) }
    );
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('formats Attachments sizes with the provider locale', () => {
    render(<Attachments attachments={[{ id: 'f', name: 'notes.pdf', url: '#', size: 1536 }]} />, {
      wrapper: wrapper({ locale: 'de-DE' }),
    });
    expect(screen.getByText('1,5 KB')).toBeInTheDocument();
  });
});

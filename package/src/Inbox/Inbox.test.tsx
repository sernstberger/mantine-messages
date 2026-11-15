import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Conversation } from '../types';
import { Inbox, InboxProps, InboxStylesNames } from './Inbox';
import { within } from '@testing-library/react';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const conversations: Conversation[] = [
  {
    id: 'maya',
    title: 'Maya Lindqvist',
    lastMessage: { authorId: 'maya', body: 'See you then', createdAt: new Date() },
  },
  { id: 'design', title: 'Design crit', unreadCount: 140, muted: true },
  { id: 'priya', title: 'Priya Raman', unreadCount: 2 },
];

const defaultProps: InboxProps = { conversations };

describe('Inbox', () => {
  tests.itSupportsSystemProps<InboxProps, InboxStylesNames>({
    component: Inbox,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Inbox',
    stylesApiSelectors: ['root', 'item', 'avatar', 'body', 'title', 'time', 'preview', 'unread'],
  });

  itSupportsAttributes({ component: Inbox, props: defaultProps, name: 'Inbox', selector: 'item' });

  it('lists conversations with previews and unread counts', () => {
    render(<Inbox {...defaultProps} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('See you then')).toBeInTheDocument();
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens a conversation on click, uncontrolled', async () => {
    const onChange = jest.fn();
    render(<Inbox {...defaultProps} defaultValue="maya" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Maya/ })).toHaveAttribute('aria-current', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Priya/ }));
    expect(onChange).toHaveBeenCalledWith('priya');
    expect(screen.getByRole('button', { name: /Priya/ })).toHaveAttribute('aria-current', 'true');
  });

  it('follows the value prop when controlled', async () => {
    render(<Inbox {...defaultProps} value="design" />);
    await userEvent.click(screen.getByRole('button', { name: /Priya/ }));
    expect(screen.getByRole('button', { name: /Design/ })).toHaveAttribute('aria-current', 'true');
  });

  it('shows the empty label', () => {
    render(<Inbox conversations={[]} emptyLabel="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('previews markdown as plain text', () => {
    render(
      <Inbox
        conversations={[
          {
            id: 'x',
            title: 'X',
            lastMessage: { authorId: 'x', body: '**Ship** it', format: 'markdown', createdAt: 0 },
          },
        ]}
      />
    );
    expect(screen.getByText('Ship it')).toBeInTheDocument();
  });
});

describe('Inbox search and sections', () => {
  const team: Conversation[] = [
    { id: 'general', title: 'general', kind: 'channel' },
    { id: 'launch', title: 'launch', kind: 'channel', pinned: true },
    { id: 'maya', title: 'Maya Lindqvist', kind: 'direct' },
    { id: 'crew', title: 'Priya, Sam', kind: 'group' },
    { id: 'old', title: 'Old chat' },
  ];

  it('filters by title with the search box, uncontrolled', async () => {
    const onSearchChange = jest.fn();
    render(<Inbox conversations={team} withSearch onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), ' MAYA ');
    expect(onSearchChange).toHaveBeenLastCalledWith(' MAYA ');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Maya/ })).toBeInTheDocument();
  });

  it('filters with a controlled search and says when nothing matches', () => {
    render(<Inbox conversations={team} search="zzz" labels={{ noResults: 'Nothing here' }} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('groups into Pinned, Channels and Direct messages', () => {
    render(<Inbox conversations={team} sections />);
    const pinned = within(screen.getByRole('group', { name: 'Pinned' })).getAllByRole('button');
    const channels = within(screen.getByRole('group', { name: 'Channels' })).getAllByRole('button');
    const direct = within(screen.getByRole('group', { name: 'Direct messages' })).getAllByRole(
      'button'
    );
    expect(pinned).toHaveLength(1);
    expect(pinned[0]).toHaveAccessibleName(/launch/);
    expect(channels).toHaveLength(1);
    expect(channels[0]).toHaveAccessibleName(/general/);
    expect(direct).toHaveLength(3);
  });

  it('hides empty sections and takes custom sections and labels', () => {
    const { rerender } = render(
      <Inbox
        conversations={team}
        sections={[{ id: 'mine', label: 'Mine', match: (c) => c.id === 'maya' }]}
      />
    );
    expect(within(screen.getByRole('group', { name: 'Mine' })).getAllByRole('button')).toHaveLength(
      1
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);

    rerender(
      <Inbox
        conversations={team.filter((c) => c.kind === 'channel' && !c.pinned)}
        sections
        labels={{ channels: 'Rooms' }}
      />
    );
    expect(screen.queryByRole('group', { name: 'Pinned' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Rooms' })).toBeInTheDocument();
  });

  it('marks channels with a # icon', () => {
    render(<Inbox conversations={team} />);
    const general = screen.getByRole('button', { name: /general/ });
    expect(general).toHaveAttribute('data-channel');
    expect(general.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maya/ })).not.toHaveAttribute('data-channel');
  });
});

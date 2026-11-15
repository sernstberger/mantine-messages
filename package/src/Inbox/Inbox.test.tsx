import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Conversation } from '../types';
import { Inbox, InboxProps, InboxStylesNames } from './Inbox';

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
});

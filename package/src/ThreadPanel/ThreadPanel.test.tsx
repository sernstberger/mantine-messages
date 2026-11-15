import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer } from '../Composer/Composer';
import type { ChatMessage, MessagesUser } from '../types';
import { ThreadPanel, ThreadPanelProps, ThreadPanelStylesNames } from './ThreadPanel';

const users: MessagesUser[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
];

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const parent: ChatMessage = {
  id: 'p',
  authorId: 'maya',
  body: 'Launch checklist',
  createdAt: at(1),
  thread: { count: 2, lastReplyAt: at(5), participantIds: ['theo', 'me'] },
};

const replies: ChatMessage[] = [
  { id: 'r1', authorId: 'theo', body: 'Release notes are mine', createdAt: at(2), threadId: 'p' },
  { id: 'r2', authorId: 'me', body: 'Pricing copy too', createdAt: at(5), threadId: 'p' },
];

const defaultProps: ThreadPanelProps = {
  parent,
  replies,
  users,
  currentUserId: 'me',
  subtitle: '#launch',
  onClose: () => {},
  children: <Composer />,
};

describe('ThreadPanel', () => {
  tests.itSupportsSystemProps<ThreadPanelProps, ThreadPanelStylesNames>({
    component: ThreadPanel,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'ThreadPanel',
    stylesApiSelectors: [
      'root',
      'header',
      'heading',
      'title',
      'subtitle',
      'close',
      'thread',
      'composer',
    ],
  });

  it('is a labelled panel with the parent, a replies divider, the replies and the composer', () => {
    render(<ThreadPanel {...defaultProps} />);
    expect(screen.getByRole('complementary', { name: 'Thread' })).toBeInTheDocument();
    expect(screen.getByText('#launch')).toBeInTheDocument();
    expect(screen.getByText('Launch checklist')).toBeInTheDocument();
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.getByText('Pricing copy too')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  });

  it('closes with its button and takes custom labels', async () => {
    const onClose = jest.fn();
    render(
      <ThreadPanel
        {...defaultProps}
        onClose={onClose}
        labels={{ title: 'Replies', close: 'Hide replies', replies: (count) => `${count} answers` }}
      />
    );
    expect(screen.getByRole('complementary', { name: 'Replies' })).toBeInTheDocument();
    expect(screen.getByText('2 answers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide replies' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves out the subtitle, close button and composer when not given', () => {
    const { container } = render(
      <ThreadPanel parent={parent} replies={replies} users={users} currentUserId="me" />
    );
    expect(screen.queryByRole('button', { name: 'Close thread' })).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-subtitle')).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-composer')).not.toBeInTheDocument();
  });

  it('passes handlers to the rows', async () => {
    const onReact = jest.fn();
    render(<ThreadPanel {...defaultProps} onReact={onReact} />);
    await userEvent.click(screen.getByRole('button', { name: 'React: Release notes are mine' }));
    expect(onReact).toHaveBeenCalledWith(replies[0]);
  });
});

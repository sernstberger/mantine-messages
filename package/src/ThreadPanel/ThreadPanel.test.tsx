import { render, screen, tests } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer } from '../Composer/Composer';
import type { MessageListHandlers } from '../MessageList/MessageList';
import type { ChatMessage, MessagesUser } from '../types';
import { ThreadPanel, ThreadPanelProps, ThreadPanelStylesNames } from './ThreadPanel';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

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

  itSupportsAttributes({
    component: ThreadPanel,
    props: defaultProps,
    name: 'ThreadPanel',
    selector: 'header',
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

  it('titles the panel with a heading, h2 by default or the level given', () => {
    const { rerender } = render(<ThreadPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Thread' })).toBeInTheDocument();
    rerender(<ThreadPanel {...defaultProps} titleOrder={4} />);
    expect(screen.getByRole('heading', { level: 4, name: 'Thread' })).toBeInTheDocument();
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

  it('shows the close button by withCloseButton, and passes closeButtonProps', async () => {
    const onClose = jest.fn();
    const onClick = jest.fn();
    const { rerender } = render(
      <ThreadPanel {...defaultProps} onClose={onClose} withCloseButton={false} />
    );
    expect(screen.queryByRole('button', { name: 'Close thread' })).not.toBeInTheDocument();

    rerender(
      <ThreadPanel
        {...defaultProps}
        onClose={onClose}
        closeButtonProps={{ className: 'own', title: 'Close', onClick }}
      />
    );
    const close = screen.getByRole('button', { name: 'Close thread' });
    expect(close).toHaveClass('own');
    expect(close).toHaveClass('mantine-ThreadPanel-close');
    expect(close).toHaveAttribute('title', 'Close');
    await userEvent.click(close);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ThreadPanel {...defaultProps} onClose={undefined} withCloseButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Close thread' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('passes history loading, grouping and handlersRef to the thread', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListHandlers>();
    const sameAuthor: ChatMessage[] = [
      { id: 's1', authorId: 'theo', body: 'One', createdAt: at(2), threadId: 'p' },
      { id: 's2', authorId: 'theo', body: 'Two', createdAt: at(3), threadId: 'p' },
    ];
    const { container, rerender } = render(
      <ThreadPanel
        {...defaultProps}
        replies={sameAuthor}
        handlersRef={control}
        hasOlder
        loadingOlder
        onLoadOlder={() => {}}
        autoScroll={false}
      />
    );
    const row = (id: string) =>
      container.querySelector(`[data-item-id="${id}"] .mantine-TeamThread-row`);
    expect(container.querySelector('.mantine-TeamThread-loader')).toBeInTheDocument();
    expect(row('s2')).toHaveAttribute('data-compact');

    act(() => control.current!.jumpTo('s1'));
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('[data-item-id="s1"]'));
    scrollIntoView.mockRestore();

    rerender(<ThreadPanel {...defaultProps} replies={sameAuthor} groupWindow={0} />);
    expect(row('s2')).not.toHaveAttribute('data-compact');
  });

  it('passes handlers to the rows', async () => {
    const onReact = jest.fn();
    render(<ThreadPanel {...defaultProps} onReact={onReact} />);
    await userEvent.click(screen.getByRole('button', { name: 'React: Release notes are mine' }));
    expect(onReact).toHaveBeenCalledWith(replies[0]);
  });
});

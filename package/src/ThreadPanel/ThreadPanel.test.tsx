import { render, screen, tests } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer } from '../Composer/Composer';
import type { MessageListHandlers } from '../MessageList/MessageList';
import type { ChatMessage, MessagesUser } from '../types';
import {
  ThreadPanel,
  ThreadPanelProps,
  ThreadPanelRepliesProps,
  ThreadPanelStylesNames,
} from './ThreadPanel';
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

const repliesProps: ThreadPanelRepliesProps = {
  parent,
  replies,
  users,
  currentUserId: 'me',
};

const defaultProps: ThreadPanelProps = {
  subtitle: '#launch',
  onClose: () => {},
  children: (
    <>
      <ThreadPanel.Replies {...repliesProps} />
      <ThreadPanel.Footer>
        <Composer />
      </ThreadPanel.Footer>
    </>
  ),
};

const panel = (replyProps: Partial<ThreadPanelRepliesProps>, props?: Partial<ThreadPanelProps>) => (
  <ThreadPanel {...props}>
    <ThreadPanel.Replies {...repliesProps} {...replyProps} />
  </ThreadPanel>
);

describe('ThreadPanel', () => {
  tests.axe([<ThreadPanel {...defaultProps} />]);

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
    selector: 'thread',
  });

  tests.itThrowsContextError({
    component: ThreadPanel.Replies,
    props: repliesProps,
    error: 'ThreadPanel component was not found in tree',
  });

  tests.itThrowsContextError({
    component: ThreadPanel.Footer,
    props: {},
    error: 'ThreadPanel component was not found in tree',
  });

  it('exposes its parts as statics', () => {
    expect(ThreadPanel.Replies.displayName).toBe('ThreadPanelReplies');
    expect(ThreadPanel.Footer.displayName).toBe('ThreadPanelFooter');
  });

  it('is a panel named by its title, with the parent, a replies divider, the replies and the footer', () => {
    render(<ThreadPanel {...defaultProps} />);
    const region = screen.getByRole('complementary', { name: 'Thread' });
    expect(region).toHaveAttribute(
      'aria-labelledby',
      screen.getByRole('heading', { name: 'Thread' }).id
    );
    expect(screen.getByText('#launch')).toBeInTheDocument();
    expect(screen.getByText('Launch checklist')).toBeInTheDocument();
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.getByText('Pricing copy too')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  });

  it('titles the panel with a heading, h2 by default or the level given', () => {
    const { rerender } = render(<ThreadPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Thread' })).toBeInTheDocument();
    rerender(<ThreadPanel {...defaultProps} titleOrder={4} title={<span>Replies</span>} />);
    expect(screen.getByRole('heading', { level: 4, name: 'Replies' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Replies' })).toBeInTheDocument();
  });

  it('styles the title and subtitle through the Styles API, with the theme focus class on the title', () => {
    const { container } = render(<ThreadPanel {...defaultProps} />);
    const title = container.querySelector('.mantine-ThreadPanel-title')!;
    const subtitle = container.querySelector('.mantine-ThreadPanel-subtitle')!;
    expect(title).toHaveClass('mantine-focus-auto');
    expect(title.getAttribute('style')).not.toMatch(/(^|;\s*)line-height:/);
    expect(subtitle.getAttribute('style') ?? '').not.toMatch(/(^|;\s*)color:/);
  });

  it('closes with its button and takes a custom close label; thread labels go to Replies', async () => {
    const onClose = jest.fn();
    render(
      panel(
        { labels: { replies: (count) => `${count} answers` } },
        { onClose, labels: { close: 'Hide replies' } }
      )
    );
    expect(screen.getByText('2 answers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide replies' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves out the subtitle, close button and footer when not given', () => {
    const { container } = render(panel({}));
    expect(screen.queryByRole('button', { name: 'Close thread' })).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-subtitle')).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ThreadPanel-composer')).not.toBeInTheDocument();
  });

  it('renders a bare child as it is', () => {
    render(
      <ThreadPanel>
        <p>Pick a thread</p>
      </ThreadPanel>
    );
    expect(screen.getByText('Pick a thread').parentElement).toHaveClass('mantine-ThreadPanel-root');
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

  it('passes unstyled to the components it renders', () => {
    const { container } = render(<ThreadPanel {...defaultProps} unstyled />);
    const nested = '.mantine-TeamThread-root, .mantine-Composer-root';
    const children = ['Title', 'Text', 'CloseButton'].map((name) =>
      [...container.querySelectorAll(`.mantine-${name}-root`)].filter(
        (element) => !element.parentElement!.closest(nested)
      )
    );
    for (const elements of children) {
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((name) => !name.startsWith('mantine-'))).toEqual([]);
      }
    }
    expect(container.querySelector('.mantine-TeamThread-root')).not.toHaveClass('root');
  });
});

describe('ThreadPanel.Replies', () => {
  const thread = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('.mantine-TeamThread-root')!;

  it('is a TeamThread styled by the panel thread selector and its own props', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      panel(
        {
          ref,
          className: 'own-thread',
          style: { color: 'red' },
          classNames: { row: 'own-row' },
        },
        { classNames: { thread: 'panel-thread' }, styles: { thread: { margin: 3 } } }
      )
    );
    const root = thread(container);
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'mantine-ThreadPanel-thread',
      'panel-thread',
      'own-thread',
      'mantine-TeamThread-root'
    );
    expect(root).toHaveStyle({ color: 'red', margin: '3px' });
    expect(container.querySelector('.mantine-TeamThread-row')).toHaveClass('own-row');
  });

  it('passes its own unstyled to the TeamThread and keeps the panel class', () => {
    const { container } = render(panel({ unstyled: true }));
    const root = thread(container);
    expect(root).toHaveClass('mantine-ThreadPanel-thread', 'thread');
    expect(root).not.toHaveClass('root');
  });

  it('passes history loading, grouping and handlersRef to the thread', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListHandlers>();
    const sameAuthor: ChatMessage[] = [
      { id: 's1', authorId: 'theo', body: 'One', createdAt: at(2), threadId: 'p' },
      { id: 's2', authorId: 'theo', body: 'Two', createdAt: at(3), threadId: 'p' },
    ];
    const { container, rerender } = render(
      panel({
        replies: sameAuthor,
        handlersRef: control,
        hasOlder: true,
        loadingOlder: true,
        onLoadOlder: () => {},
        autoScroll: false,
      })
    );
    const row = (id: string) =>
      container.querySelector(`[data-item-id="${id}"] .mantine-TeamThread-row`);
    expect(container.querySelector('.mantine-TeamThread-loader')).toBeInTheDocument();
    expect(row('s2')).toHaveAttribute('data-compact');

    act(() => control.current!.jumpTo('s1'));
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('[data-item-id="s1"]'));
    scrollIntoView.mockRestore();

    rerender(panel({ replies: sameAuthor, groupWindow: 0 }));
    expect(row('s2')).not.toHaveAttribute('data-compact');
  });

  it('passes handlers to the rows', async () => {
    const onReact = jest.fn();
    render(panel({ onReact }));
    await userEvent.click(screen.getByRole('button', { name: 'React: Release notes are mine' }));
    expect(onReact).toHaveBeenCalledWith(replies[0]);
  });
});

describe('ThreadPanel.Footer', () => {
  it('wraps its children with the composer selector and takes Styles API props of its own', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ThreadPanel classNames={{ composer: 'panel-composer' }}>
        <ThreadPanel.Footer
          ref={ref}
          className="own"
          classNames={{ composer: 'own-composer' }}
          styles={{ composer: { margin: 3 } }}
          data-x="1"
        >
          <Composer />
        </ThreadPanel.Footer>
      </ThreadPanel>
    );
    const footer = screen
      .getByRole('textbox')
      .closest<HTMLElement>('.mantine-ThreadPanel-composer')!;
    expect(ref.current).toBe(footer);
    expect(footer).toHaveClass('composer', 'panel-composer', 'own-composer', 'own');
    expect(footer).toHaveStyle({ margin: '3px' });
    expect(footer).toHaveAttribute('data-x', '1');
  });
});

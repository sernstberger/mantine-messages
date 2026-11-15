import { render, screen, tests } from '@mantine-tests/core';
import React from 'react';
import { Message, MessageProps, MessageStylesNames } from './Message';
import { getRenderError } from '../../../test-utils/get-render-error';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const defaultProps: MessageProps = {
  children: [
    <Message.Avatar key="avatar" name="Maya Lindqvist" />,
    <Message.Body key="body">
      <Message.Meta>Maya Lindqvist · 9:41</Message.Meta>
      Hello
    </Message.Body>,
  ],
};

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-Message-root')!;

describe('Message', () => {
  tests.axe([<Message {...defaultProps} />, <Message compact {...defaultProps} />]);

  tests.itSupportsSystemProps<MessageProps, MessageStylesNames>({
    component: Message,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Message',
    stylesApiSelectors: ['root', 'avatar', 'body', 'meta'],
  });

  itSupportsAttributes({
    component: Message,
    props: defaultProps,
    name: 'Message',
    selector: 'avatar',
  });

  itHasStaticVarsResolver({ component: Message });

  it('sets the avatar size variable, 36 by default, and sizes the avatar with it', () => {
    const { container, rerender } = render(<Message {...defaultProps} />);
    expect(getRoot(container).style.getPropertyValue('--message-avatar-size')).toBe(
      'calc(2.25rem * var(--mantine-scale))'
    );
    expect(container.querySelector('.mantine-Message-avatar')).toHaveStyle({
      '--avatar-size': 'calc(2.25rem * var(--mantine-scale))',
    });

    rerender(<Message {...defaultProps} avatarSize="lg" />);
    expect(getRoot(container).style.getPropertyValue('--message-avatar-size')).toBe(
      'var(--message-avatar-size-lg)'
    );
    expect(container.querySelector('.mantine-Message-avatar')).toHaveStyle({
      '--avatar-size': 'var(--avatar-size-lg)',
    });
  });

  it('sets the avatar size from a number', () => {
    const { container } = render(<Message {...defaultProps} avatarSize={48} />);
    expect(getRoot(container).style.getPropertyValue('--message-avatar-size')).toBe(
      'calc(3rem * var(--mantine-scale))'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <Message {...defaultProps} vars={() => ({ root: { '--message-avatar-size': '20px' } })} />
    );
    expect(getRoot(container).style.getPropertyValue('--message-avatar-size')).toBe('20px');
  });

  it('gives Message.Avatar a radius, md by default', () => {
    const { container } = render(
      <Message>
        <Message.Avatar name="Maya Lindqvist" />
        <Message.Avatar name="Maya Lindqvist" radius="xl" />
      </Message>
    );
    const [first, second] = container.querySelectorAll('.mantine-Message-avatar');
    expect(first).toHaveStyle({ '--avatar-radius': 'var(--mantine-radius-md)' });
    expect(second).toHaveStyle({ '--avatar-radius': 'var(--mantine-radius-xl)' });
  });

  it('passes unstyled to the avatar', () => {
    const { container } = render(<Message {...defaultProps} unstyled />);
    const avatar = container.querySelector('.mantine-Avatar-root')!;
    expect([...avatar.classList].filter((name) => !name.startsWith('mantine-'))).toEqual([]);
  });

  it('renders an avatar with initials, a meta line and the text', () => {
    render(<Message {...defaultProps} />);
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('Maya Lindqvist · 9:41')).toHaveClass('mantine-Message-meta');
    expect(screen.getByText('Hello')).toHaveClass('mantine-Message-body');
  });

  it('marks a follow-up as compact and keeps the app mod', () => {
    const { container } = render(
      <Message compact mod={{ internal: true }}>
        <Message.Meta>9:42</Message.Meta>
        <Message.Body>Again</Message.Body>
      </Message>
    );
    const root = container.querySelector('.mantine-Message-root');
    expect(root).toHaveAttribute('data-compact');
    expect(root).toHaveAttribute('data-internal');
  });

  it('takes className and style on each part', () => {
    render(
      <Message>
        <Message.Body className="note" style={{ color: 'red' }}>
          Hi
        </Message.Body>
      </Message>
    );
    expect(screen.getByText('Hi')).toHaveClass('note', 'mantine-Message-body');
    expect(screen.getByText('Hi')).toHaveStyle({ color: 'red' });
  });

  it('throws when a part is used outside Message', () => {
    expect(getRenderError(<Message.Body>Hi</Message.Body>)).toHaveProperty(
      'message',
      'Message.Avatar, Message.Body and Message.Meta must be used inside Message'
    );
  });
});

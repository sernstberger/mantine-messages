import { render, screen, tests } from '@mantine-tests/core';
import React from 'react';
import { Message, MessageProps, MessageStylesNames } from './Message';

const defaultProps: MessageProps = {
  children: [
    <Message.Avatar key="avatar" name="Maya Lindqvist" />,
    <Message.Body key="body">
      <Message.Meta>Maya Lindqvist · 9:41</Message.Meta>
      Hello
    </Message.Body>,
  ],
};

describe('Message', () => {
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
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Message.Body>Hi</Message.Body>)).toThrow(
      'Message.Avatar, Message.Body and Message.Meta must be used inside Message'
    );
    error.mockRestore();
  });
});

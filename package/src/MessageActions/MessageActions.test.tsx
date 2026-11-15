import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MessageActions, MessageActionsProps, MessageActionsStylesNames } from './MessageActions';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const defaultProps: MessageActionsProps = { actions: ['reply'], text: 'Hi', onReply: () => {} };

describe('MessageActions', () => {
  tests.itSupportsSystemProps<MessageActionsProps, MessageActionsStylesNames>({
    component: MessageActions,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MessageActions',
    stylesApiSelectors: ['root', 'action'],
  });

  itSupportsAttributes({
    component: MessageActions,
    props: defaultProps,
    name: 'MessageActions',
    selector: 'action',
  });

  it('shows built-ins only with a handler, labelled with the message', async () => {
    const onReply = jest.fn();
    render(
      <MessageActions actions={['reply', 'react', 'edit']} text="See you" onReply={onReply} />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Reply: See you' }));
    expect(onReply).toHaveBeenCalled();
  });

  it('renders nothing when no action applies', () => {
    const { container } = render(<MessageActions actions={['react']} text="x" />);
    expect(container.querySelector('.mantine-MessageActions-root')).not.toBeInTheDocument();
  });

  it('copies the text and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MessageActions actions={['copy']} text="Copy me" labels={{ copied: 'Done' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Copy me' }));
    expect(writeText).toHaveBeenCalledWith('Copy me');
    expect(await screen.findByRole('button', { name: 'Done: Copy me' })).toBeInTheDocument();
  });

  it('puts actions past maxVisible in a More menu, with custom items', async () => {
    const onArchive = jest.fn();
    const onThread = jest.fn();
    const onEdit = jest.fn();
    const { container } = render(
      <MessageActions
        maxVisible={2}
        text="Hi"
        onReact={() => {}}
        onThread={onThread}
        onEdit={onEdit}
        actions={[
          'react',
          'thread',
          'edit',
          { id: 'archive', label: 'Archive', icon: <span />, onClick: onArchive, color: 'red' },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: 'React: Hi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply in thread: Hi' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(container.querySelector('[data-menu-open]')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    expect(onArchive).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reply in thread' }));
    expect(onThread).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalled();
  });

  it('labels buttons with preview but copies text', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MessageActions actions={['copy']} text="**Bold** move" preview="Bold move" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Bold move' }));
    expect(writeText).toHaveBeenCalledWith('**Bold** move');
    expect(await screen.findByRole('button', { name: 'Copied: Bold move' })).toBeInTheDocument();
  });
});

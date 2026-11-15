import { render, screen, tests } from '@mantine-tests/core';
import { DirectionProvider } from '@mantine/core';
import { fireEvent, waitFor } from '@testing-library/react';
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

  it('names the toolbar and the menu button after whose message it is', () => {
    const many = {
      text: 'Hi',
      maxVisible: 1,
      onReact: () => {},
      onEdit: () => {},
      actions: ['react', 'edit'] as MessageActionsProps['actions'],
    };
    const { rerender } = render(<MessageActions {...many} author="Maya" />);
    expect(screen.getByRole('toolbar', { name: "Actions for Maya's message" })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "More actions for Maya's message" })
    ).toBeInTheDocument();

    rerender(<MessageActions {...many} author="Maya" own />);
    expect(screen.getByRole('toolbar', { name: 'Actions for your message' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'More actions for your message' })
    ).toBeInTheDocument();

    rerender(<MessageActions {...many} />);
    expect(screen.getByRole('toolbar', { name: 'Message actions' })).toBeInTheDocument();

    rerender(
      <MessageActions
        {...many}
        author="Maya"
        labels={{ more: ({ author }) => `Mehr zu ${author}`, toolbar: () => 'Aktionen' }}
      />
    );
    expect(screen.getByRole('toolbar', { name: 'Aktionen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mehr zu Maya' })).toBeInTheDocument();

    rerender(<MessageActions {...many} aria-label="Tools" />);
    expect(screen.getByRole('toolbar', { name: 'Tools' })).toBeInTheDocument();
  });

  it('is one tab stop; arrows, Home and End move between the buttons', async () => {
    const onKeyDown = jest.fn();
    render(
      <>
        <button type="button">Before</button>
        <MessageActions
          text="Hi"
          maxVisible={3}
          onReply={() => {}}
          onReact={() => {}}
          onEdit={() => {}}
          onThread={() => {}}
          actions={['reply', 'react', 'thread', 'edit']}
          onKeyDown={onKeyDown}
        />
        <button type="button">After</button>
      </>
    );
    const reply = screen.getByRole('button', { name: 'Reply: Hi' });
    const react = screen.getByRole('button', { name: 'React: Hi' });
    const more = screen.getByRole('button', { name: 'More actions' });
    expect(reply).toHaveAttribute('tabindex', '0');
    expect(react).toHaveAttribute('tabindex', '-1');
    expect(more).toHaveAttribute('tabindex', '-1');

    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.tab();
    expect(reply).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(react).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(more).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(reply).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(more).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(reply).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(more).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(more).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(more).toHaveFocus();
    expect(onKeyDown).toHaveBeenCalledTimes(8);
  });

  it('swaps the arrows in right-to-left layouts, and ignores keys on the toolbar itself', () => {
    render(
      <DirectionProvider initialDirection="rtl">
        <MessageActions
          text="Hi"
          onReply={() => {}}
          onReact={() => {}}
          actions={['reply', 'react']}
        />
      </DirectionProvider>
    );
    const reply = screen.getByRole('button', { name: 'Reply: Hi' });
    const react = screen.getByRole('button', { name: 'React: Hi' });
    reply.focus();
    fireEvent.keyDown(reply, { key: 'ArrowLeft' });
    expect(react).toHaveFocus();
    fireEvent.keyDown(react, { key: 'ArrowRight' });
    expect(reply).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'End' });
    expect(reply).toHaveFocus();
  });

  it('keeps one tab stop when the button that had it goes away', () => {
    const props = { text: 'Hi', onReply: () => {}, onReact: () => {} };
    const { rerender } = render(<MessageActions {...props} actions={['reply', 'react']} />);
    fireEvent.focus(screen.getByRole('button', { name: 'React: Hi' }));
    rerender(<MessageActions {...props} actions={['reply']} />);
    expect(screen.getByRole('button', { name: 'Reply: Hi' })).toHaveAttribute('tabindex', '0');
  });

  it('mounts the menu on first use, and gives focus back to its button on Escape', async () => {
    render(
      <MessageActions
        text="Hi"
        maxVisible={1}
        onReact={() => {}}
        onEdit={() => {}}
        actions={['react', 'edit']}
      />
    );
    const closed = screen.getByRole('button', { name: 'More actions' });
    expect(closed).toHaveAttribute('aria-haspopup', 'menu');
    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[data-position]')).not.toBeInTheDocument();

    await userEvent.click(closed);
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('asks for a preview function only when a button shows', () => {
    const preview = jest.fn(() => 'Plain');
    const { rerender } = render(
      <MessageActions actions={['reply']} text="**md**" preview={preview} />
    );
    expect(preview).not.toHaveBeenCalled();
    rerender(
      <MessageActions actions={['reply']} text="**md**" preview={preview} onReply={() => {}} />
    );
    expect(preview).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reply: Plain' })).toBeInTheDocument();
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

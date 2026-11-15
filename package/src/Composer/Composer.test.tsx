import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer, ComposerProps, ComposerStylesNames } from './Composer';

const defaultProps: ComposerProps = {};

describe('Composer', () => {
  tests.itSupportsSystemProps<ComposerProps, ComposerStylesNames>({
    component: Composer,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Composer',
    stylesApiSelectors: ['root', 'send'],
  });

  it('sends trimmed text on Enter and clears', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} />);
    const box = screen.getByRole('textbox', { name: 'Message' });

    await userEvent.type(box, '  hello  {Enter}');
    expect(onSend).toHaveBeenCalledWith({ text: 'hello', format: 'text', attachments: [] });
    expect(box).toHaveValue('');
  });

  it('adds a new line on Shift+Enter instead of sending', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} />);
    await userEvent.type(screen.getByRole('textbox'), 'one{Shift>}{Enter}{/Shift}two');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('one\ntwo');
  });

  it('sends with the button, which is disabled while the box is empty', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} labels={{ send: 'Post' }} />);
    const button = screen.getByRole('button', { name: 'Post' });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), 'hi');
    await userEvent.click(button);
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text', attachments: [] });
  });

  it('does not send blank text or while disabled', async () => {
    const onSend = jest.fn();
    const { rerender } = render(<Composer onSend={onSend} />);
    await userEvent.type(screen.getByRole('textbox'), '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();

    rerender(<Composer onSend={onSend} value="hi" disabled />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('works controlled', async () => {
    const onChange = jest.fn();
    render(<Composer value="draft" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), '!');
    expect(onChange).toHaveBeenCalledWith('draft!');
  });

  it('shows who the reply is for and focuses the box', () => {
    render(<Composer replyTo={{ id: 'm1', authorName: 'Maya', body: 'Can you send it?' }} />);
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Can you send it?')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('cancels the reply with the close button or Escape', async () => {
    const onCancelReply = jest.fn();
    render(
      <Composer
        replyTo={{ id: 'm1', authorName: 'Maya', body: 'Hi' }}
        onCancelReply={onCancelReply}
        labels={{ cancelReply: 'Stop replying' }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stop replying' }));
    await userEvent.type(screen.getByRole('textbox'), '{Escape}');
    expect(onCancelReply).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape when not replying', async () => {
    const onCancelReply = jest.fn();
    render(<Composer onCancelReply={onCancelReply} />);
    await userEvent.type(screen.getByRole('textbox'), '{Escape}');
    expect(onCancelReply).not.toHaveBeenCalled();
  });

  it('sends the reply id and the format with the draft', async () => {
    const onSend = jest.fn();
    render(
      <Composer
        format="markdown"
        replyTo={{ id: 'm1', authorName: 'Maya', body: 'Hi' }}
        onSend={onSend}
      />
    );
    await userEvent.type(screen.getByRole('textbox'), '**yes**{Enter}');
    expect(onSend).toHaveBeenCalledWith({
      text: '**yes**',
      format: 'markdown',
      attachments: [],
      replyToId: 'm1',
    });
  });
});

describe('Composer modes', () => {
  const modes = [
    { value: 'reply', label: 'Reply' },
    {
      value: 'note',
      label: 'Note',
      color: 'yellow',
      note: true,
      placeholder: 'Only teammates see notes',
    },
  ];

  it('starts in the first mode and sends it with the draft', async () => {
    const onSend = jest.fn();
    const { container } = render(<Composer modes={modes} onSend={onSend} />);
    expect(screen.getByRole('radio', { name: 'Reply' })).toBeChecked();
    expect(container.querySelector('.mantine-Composer-root')).toHaveAttribute('data-mode', 'reply');
    expect(container.querySelector('.mantine-Composer-root')).not.toHaveAttribute('data-note');

    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'hi{Enter}');
    expect(onSend).toHaveBeenCalledWith({
      text: 'hi',
      format: 'text',
      attachments: [],
      mode: 'reply',
    });
  });

  it('switches to a note mode, with its placeholder and note styling', async () => {
    const onModeChange = jest.fn();
    const { container } = render(<Composer modes={modes} onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Note' }));
    expect(onModeChange).toHaveBeenCalledWith('note');

    const root = container.querySelector('.mantine-Composer-root');
    expect(root).toHaveAttribute('data-mode', 'note');
    expect(root).toHaveAttribute('data-note');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'placeholder',
      'Only teammates see notes'
    );
  });

  it('follows a controlled mode, and starts from defaultMode', async () => {
    const { rerender } = render(<Composer modes={modes} mode="note" />);
    await userEvent.click(screen.getByRole('radio', { name: 'Reply' }));
    expect(screen.getByRole('radio', { name: 'Note' })).toBeChecked();

    rerender(<Composer modes={modes} defaultMode="note" key="fresh" />);
    expect(screen.getByRole('radio', { name: 'Note' })).toBeChecked();
  });

  it('labels the switch, for translation', () => {
    render(<Composer modes={modes} labels={{ modes: 'Kind of message' }} />);
    expect(screen.getByRole('radiogroup', { name: 'Kind of message' })).toBeInTheDocument();
  });

  it('sends no mode while the mode is not one of the modes', async () => {
    const onSend = jest.fn();
    const { container } = render(<Composer modes={modes} mode="other" onSend={onSend} />);
    expect(container.querySelector('.mantine-Composer-root')).not.toHaveAttribute('data-mode');

    await userEvent.type(screen.getByRole('textbox'), 'hi{Enter}');
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text', attachments: [] });
  });
});

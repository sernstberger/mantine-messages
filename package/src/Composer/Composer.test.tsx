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

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
    expect(onSend).toHaveBeenCalledWith('hello');
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
    render(<Composer onSend={onSend} sendLabel="Post" />);
    const button = screen.getByRole('button', { name: 'Post' });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), 'hi');
    await userEvent.click(button);
    expect(onSend).toHaveBeenCalledWith('hi');
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
});

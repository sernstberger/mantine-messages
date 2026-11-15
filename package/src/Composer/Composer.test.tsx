import { render, screen, tests } from '@mantine-tests/core';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Composer, ComposerProps, ComposerStylesNames } from './Composer';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const defaultProps: ComposerProps = {};

const busyProps: ComposerProps = {
  replyTo: { id: 'm1', authorName: 'Maya', body: 'Can you send it?' },
  modes: [
    { value: 'reply', label: 'Reply' },
    { value: 'note', label: 'Note', note: true },
  ],
  leftSection: <span>left</span>,
  rightSection: <span>right</span>,
};

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-Composer-root')!;

describe('Composer', () => {
  tests.itSupportsSystemProps<ComposerProps, ComposerStylesNames>({
    component: Composer,
    props: busyProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'Composer',
    stylesApiSelectors: [
      'root',
      'modes',
      'reply',
      'replyText',
      'replyLabel',
      'replyAuthor',
      'replyBody',
      'cancelReply',
      'field',
      'section',
      'input',
      'send',
    ],
  });

  tests.axe([<Composer {...defaultProps} />, <Composer {...busyProps} />]);

  itHasStaticVarsResolver({ component: Composer });

  itSupportsAttributes({
    component: Composer,
    props: defaultProps,
    name: 'Composer',
    selector: 'send',
  });

  it('sends trimmed text on Enter and clears', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} />);
    const box = screen.getByRole('textbox', { name: 'Message' });

    await userEvent.type(box, '  hello  {Enter}');
    expect(onSend).toHaveBeenCalledWith({ text: 'hello', format: 'text' });
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
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text' });
  });

  it('keeps focus in the box after sending with the button or Enter', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} />);
    const box = screen.getByRole('textbox');

    await userEvent.type(box, 'one');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(box).toHaveFocus();

    await userEvent.type(box, 'two{Enter}');
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(box).toHaveFocus();
  });

  it('does not send blank text or while disabled', async () => {
    const onSend = jest.fn();
    const { rerender } = render(<Composer onSend={onSend} />);
    await userEvent.type(screen.getByRole('textbox'), '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();

    rerender(<Composer onSend={onSend} value="hi" disabled />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('is read only: the text can be selected but not changed or sent', async () => {
    const onSend = jest.fn();
    render(<Composer onSend={onSend} defaultValue="locked" readOnly />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('readonly');
    await userEvent.type(box, '!{Enter}');
    expect(box).toHaveValue('locked');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('gives the text box a ref and props, running its handlers after its own', async () => {
    const inputRef = React.createRef<HTMLTextAreaElement>();
    const onChange = jest.fn();
    const onKeyDown = jest.fn();
    const onSend = jest.fn();
    render(
      <Composer
        onSend={onSend}
        inputRef={inputRef}
        textareaProps={{ name: 'reply', maxLength: 20, onChange, onKeyDown }}
      />
    );
    const box = screen.getByRole('textbox');
    expect(inputRef.current).toBe(box);
    expect(box).toHaveAttribute('name', 'reply');
    expect(box).toHaveAttribute('maxlength', '20');

    await userEvent.type(box, 'hi{Enter}');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onKeyDown).toHaveBeenCalledTimes(3);
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text' });
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

  it('describes the box with the reply bar, after any description of its own', () => {
    const { rerender } = render(
      <Composer replyTo={{ id: 'm1', authorName: 'Maya', body: 'Can you send it?' }} />
    );
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Replying to Maya Can you send it?'
    );

    rerender(
      <>
        <span id="hint">Enter sends</span>
        <Composer
          replyTo={{ id: 'm1', authorName: 'Maya', body: 'Can you send it?' }}
          textareaProps={{ 'aria-describedby': 'hint' }}
        />
      </>
    );
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Replying to Maya Can you send it? Enter sends'
    );

    rerender(<Composer textareaProps={{ 'aria-describedby': 'hint' }} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'hint');
    rerender(<Composer />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
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

  it('moves focus to the text box when the cancel button is used', async () => {
    render(
      <Composer
        replyTo={{ id: 'm1', authorName: 'Maya', body: 'Hi' }}
        labels={{ cancelReply: 'Stop replying' }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stop replying' }));
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('merges className and style from textareaProps with the Styles API', () => {
    render(
      <Composer
        textareaProps={{ className: 'mine', style: { color: 'red' } }}
        classNames={{ input: 'theirs' }}
      />
    );
    const box = screen.getByRole('textbox').closest('.mine')!;
    expect(box).toHaveClass('mantine-Composer-input', 'theirs', 'mine');
    expect(box).toHaveStyle({ color: 'red' });
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
      replyToId: 'm1',
    });
  });
  it('turns send into stop while an answer streams, and keeps the text', async () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    render(<Composer onSend={onSend} onStop={onStop} streaming labels={{ stop: 'Stop answer' }} />);
    const stop = screen.getByRole('button', { name: 'Stop answer' });
    expect(stop).toBeEnabled();
    expect(stop).toHaveAttribute('data-streaming');

    await userEvent.type(screen.getByRole('textbox'), 'next question{Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('next question');

    await userEvent.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
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
    expect(onSend).toHaveBeenCalledWith({ text: 'hi', format: 'text' });
  });

  it('sets only the section size variable by default', () => {
    const { container } = render(<Composer />);
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--composer-radius')).toBe('');
    expect(root.style.getPropertyValue('--composer-section-size')).toBe(
      'var(--composer-section-size-sm)'
    );
  });

  it('sets the radius and section size variables from props', () => {
    const { container } = render(<Composer radius="xs" size="lg" />);
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--composer-radius')).toBe('var(--mantine-radius-xs)');
    expect(root.style.getPropertyValue('--composer-section-size')).toBe(
      'var(--composer-section-size-lg)'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <Composer vars={() => ({ root: { '--composer-radius': '3px' } })} />
    );
    expect(getRoot(container).style.getPropertyValue('--composer-radius')).toBe('3px');
  });

  it('sizes the children from size and keeps the default sizes at size sm', () => {
    const { container, rerender } = render(<Composer {...busyProps} />);
    const send = () => container.querySelector('.mantine-Composer-send')!;
    const close = () => container.querySelector('.mantine-Composer-cancelReply')!;
    const modes = () => container.querySelector('.mantine-Composer-modes')!;
    expect(send()).toHaveAttribute('data-size', 'lg');
    expect(close()).toHaveAttribute('data-size', 'sm');
    expect(modes()).toHaveAttribute('data-size', 'xs');

    rerender(<Composer {...busyProps} size="xl" radius="md" />);
    expect(send()).toHaveAttribute('data-size', 'input-xl');
    expect(close()).toHaveAttribute('data-size', 'xl');
    expect(modes()).toHaveAttribute('data-size', 'lg');
  });

  it('renders leftSection and rightSection around the text box', () => {
    const { container } = render(
      <Composer leftSection={<span>attach</span>} rightSection={<span>emoji</span>} />
    );
    const sections = container.querySelectorAll('.mantine-Composer-section');
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveAttribute('data-position', 'left');
    expect(sections[0]).toHaveTextContent('attach');
    expect(sections[1]).toHaveAttribute('data-position', 'right');
    expect(sections[1]).toHaveTextContent('emoji');
  });

  it('renders no section without leftSection and rightSection', () => {
    const { container } = render(<Composer />);
    expect(container.querySelector('.mantine-Composer-section')).toBeNull();
  });

  it('passes unstyled to the components it renders', () => {
    const { container } = render(<Composer {...busyProps} unstyled />);
    const names = ['SegmentedControl', 'Text', 'CloseButton', 'Textarea', 'ActionIcon'];
    for (const name of names) {
      const elements = container.querySelectorAll(`.mantine-${name}-root`);
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((cls) => !cls.startsWith('mantine-'))).toEqual([]);
      }
    }
  });
});

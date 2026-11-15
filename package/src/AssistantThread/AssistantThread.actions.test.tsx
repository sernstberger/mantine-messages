import { render, screen } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AssistantMessage } from '../types';
import { AssistantThread } from './AssistantThread';

const prompt: AssistantMessage = {
  id: 'p1',
  authorId: 'me',
  role: 'user',
  createdAt: new Date(2026, 10, 15, 9),
  parts: [{ type: 'text', text: 'Write a debounce hook' }],
};

const answer: AssistantMessage = {
  id: 'a1',
  authorId: 'assistant',
  role: 'assistant',
  createdAt: new Date(2026, 10, 15, 9, 1),
  status: 'done',
  parts: [{ type: 'text', text: 'Here it is.', state: 'done' }],
};

describe('AssistantThread actions', () => {
  it('copies answers and prompts, and regenerates only the last answer', async () => {
    const onRegenerate = jest.fn();
    const older: AssistantMessage = {
      ...answer,
      id: 'a0',
      parts: [{ type: 'text', text: 'Older answer' }],
    };
    render(
      <AssistantThread
        messages={[older, prompt, answer]}
        onRegenerate={onRegenerate}
        labels={{ regenerate: 'Try again' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Copy: Older answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy: Write a debounce hook' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again: Older answer' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit:/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again: Here it is.' }));
    expect(onRegenerate).toHaveBeenCalledWith(answer);
  });

  it('copies the text parts of an answer and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<AssistantThread messages={[prompt, answer]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy: Here it is.' }));
    expect(writeText).toHaveBeenCalledWith('Here it is.');
    // The copied state arrives after the clipboard write resolves
    expect(await screen.findByRole('button', { name: 'Copied: Here it is.' })).toBeInTheDocument();
  });

  it('hides actions while streaming, and offers Retry on an error', async () => {
    const onRegenerate = jest.fn();
    const { rerender } = render(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'streaming' }]}
        onRegenerate={onRegenerate}
        onEdit={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /^Copy: Here/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit:/ })).not.toBeInTheDocument();

    rerender(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'error', error: 'Timed out' }]}
        onRegenerate={onRegenerate}
        labels={{ retry: 'Retry now' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Timed out');
    // Errors are announced by the alert, not the status region
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('edits a prompt in place and sends the new text', async () => {
    const onEdit = jest.fn();
    render(
      <AssistantThread messages={[prompt, answer]} onEdit={onEdit} labels={{ send: 'Save' }} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));
    const box = screen.getByRole('textbox', { name: 'Edit message' });
    expect(box).toHaveFocus();
    expect(box).toHaveValue('Write a debounce hook');

    await userEvent.clear(box);
    await userEvent.type(box, '{Enter}');
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.type(box, ' Write a throttle hook ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onEdit).toHaveBeenCalledWith(prompt, 'Write a throttle hook');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends an edit with Enter and cancels with Escape or the button', async () => {
    const onEdit = jest.fn();
    render(
      <AssistantThread
        messages={[prompt, answer]}
        onEdit={onEdit}
        labels={{ cancel: 'Never mind' }}
      />
    );
    const edit = () =>
      userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));

    await edit();
    await userEvent.type(screen.getByRole('textbox'), '{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await edit();
    await userEvent.click(screen.getByRole('button', { name: 'Never mind' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await edit();
    await userEvent.type(screen.getByRole('textbox'), '!{Enter}');
    expect(onEdit).toHaveBeenCalledWith(prompt, 'Write a debounce hook!');
  });
});

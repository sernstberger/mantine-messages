import { render, screen } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import type { AssistantMessage } from '../types';
import { AssistantThread, AssistantThreadProps } from './AssistantThread';

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const prompt: AssistantMessage = {
  id: 'p1',
  authorId: 'me',
  role: 'user',
  createdAt: at(0),
  parts: [{ type: 'text', text: 'Write a debounce hook' }],
};

function countedAnswer(id: string, text: string) {
  const counter = { reads: 0 };
  const parts: AssistantMessage['parts'] = [{ type: 'text', text, state: 'done' }];
  const message = {
    id,
    authorId: 'assistant',
    role: 'assistant',
    createdAt: at(1),
    status: 'done',
  } as AssistantMessage;
  Object.defineProperty(message, 'parts', {
    get: () => {
      counter.reads += 1;
      return parts;
    },
  });
  return { message, counter };
}

const streaming = (id: string, text: string): AssistantMessage => ({
  id,
  authorId: 'assistant',
  role: 'assistant',
  createdAt: at(2),
  status: 'streaming',
  parts: [{ type: 'text', text, state: 'streaming' }],
});

function setup(initial: AssistantMessage[], props: Partial<AssistantThreadProps> = {}) {
  let update: (messages: AssistantMessage[]) => void = () => {};
  let updateProps: (next: Partial<AssistantThreadProps>) => void = () => {};

  function Harness() {
    const [messages, setMessages] = useState(initial);
    const [extra, setExtra] = useState<Partial<AssistantThreadProps>>({});
    update = setMessages;
    updateProps = setExtra;
    return (
      <AssistantThread
        messages={messages}
        onRegenerate={() => {}}
        onEdit={(message, text) =>
          setMessages((current) =>
            current.map((item) =>
              item.id === message.id
                ? { ...prompt, id: 'p2', parts: [{ type: 'text', text }] }
                : item
            )
          )
        }
        labels={{ copy: 'Copy' }}
        {...props}
        {...extra}
      />
    );
  }

  const view = render(<Harness />);
  return {
    ...view,
    update: (messages: AssistantMessage[]) => act(() => update(messages)),
    updateProps: (next: Partial<AssistantThreadProps>) => act(() => updateProps(next)),
  };
}

describe('AssistantThread rendering', () => {
  it('renders only the streaming answer per token, even with inline callbacks and labels', () => {
    const older = countedAnswer('a0', 'Older **answer**');
    const history = [prompt, older.message];
    const { update } = setup(history);

    update([...history, { ...prompt, id: 'p2' }, streaming('a1', 'One')]);
    older.counter.reads = 0;
    update([...history, { ...prompt, id: 'p2' }, streaming('a1', 'One two')]);
    update([...history, { ...prompt, id: 'p2' }, streaming('a1', 'One two three')]);
    expect(older.counter.reads).toBe(0);
    expect(screen.getByText('One two three')).toBeInTheDocument();
  });

  it('renders finished answers again when labels or Styles API props change', () => {
    const older = countedAnswer('a0', 'Older answer');
    const { updateProps, container } = setup([prompt, older.message]);

    updateProps({ labels: { copy: 'Copy text' } });
    expect(screen.getByRole('button', { name: 'Copy text: Older answer' })).toBeInTheDocument();

    updateProps({ labels: { copy: 'Copy text' }, classNames: { answer: 'my-answer' } });
    expect(container.querySelector('.my-answer')).toHaveTextContent('Older answer');
  });

  it('marks the streaming answer busy and the Thinking indicator as an image with a name', () => {
    const { update, container } = setup([prompt, { ...streaming('a1', ''), parts: [] }]);
    const turn = () => container.querySelector('[data-role="assistant"]')!;
    expect(turn()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('img', { name: 'Thinking…' })).toBeInTheDocument();

    update([prompt, { ...streaming('a1', 'Done'), status: 'done' }]);
    expect(turn()).not.toHaveAttribute('aria-busy');
  });

  it('says Thinking again for the next answer after one failed', () => {
    const { update } = setup([prompt, streaming('a1', '')]);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Thinking…');

    update([prompt, { ...streaming('a1', ''), status: 'error', error: 'Timed out' }]);
    expect(status).toBeEmptyDOMElement();

    update([prompt, streaming('a2', '')]);
    expect(status).toHaveTextContent('Thinking…');
  });
});

describe('AssistantThread focus after editing a prompt', () => {
  const answer = countedAnswer('a1', 'Here it is.').message;
  const editButton = () => screen.getByRole('button', { name: 'Edit: Write a debounce hook' });

  it('returns focus to the Edit button after Escape or Cancel', async () => {
    setup([prompt, answer]);

    await userEvent.click(editButton());
    await userEvent.keyboard('{Escape}');
    expect(editButton()).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('textbox')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(editButton()).toHaveFocus();
  });

  it('focuses the prompt after sending an edit, while the new answer streams', async () => {
    const { container } = setup([prompt, answer], {
      onEdit: () => {},
      labels: { edit: 'Change' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Change: Write a debounce hook' }));
    await userEvent.keyboard('{Enter}');
    expect(container.querySelector('[data-item-id="p1"] > [data-role="user"]')).toHaveFocus();
  });

  it('focuses the newest prompt when the app replaces the edited one', async () => {
    const { container } = setup([prompt, answer]);
    await userEvent.click(editButton());
    await userEvent.keyboard(' again{Enter}');
    expect(container.querySelector('[data-item-id="p2"] > [data-role="user"]')).toHaveFocus();
  });

  it('focuses the prompt when Edit is gone because an answer started meanwhile', async () => {
    const { update, container } = setup([prompt, answer]);
    await userEvent.click(editButton());
    update([prompt, answer, { ...prompt, id: 'p3' }, streaming('a3', '')]);
    await userEvent.keyboard('{Escape}');
    expect(container.querySelector('[data-item-id="p1"] > [data-role="user"]')).toHaveFocus();
  });

  it('leaves focus alone when the app removes every prompt', async () => {
    const { update } = setup([prompt, answer], { onEdit: () => update([]) });
    await userEvent.click(editButton());
    await userEvent.keyboard('{Enter}');
    expect(document.body).toHaveFocus();
  });
});

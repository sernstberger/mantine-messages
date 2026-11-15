import { render, screen, tests } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import type { MessageListControl } from '../MessageList/MessageList';
import type { AssistantMessage } from '../types';
import {
  AssistantThread,
  AssistantThreadProps,
  AssistantThreadStylesNames,
} from './AssistantThread';

const at = (minute: number) => new Date(2026, 10, 15, 9, minute);

const prompt: AssistantMessage = {
  id: 'p1',
  authorId: 'me',
  role: 'user',
  createdAt: at(0),
  parts: [{ type: 'text', text: 'Write a debounce hook' }],
};

const answer: AssistantMessage = {
  id: 'a1',
  authorId: 'assistant',
  role: 'assistant',
  createdAt: at(1),
  status: 'done',
  parts: [
    { type: 'reasoning', text: 'The user wants a hook.', state: 'done' },
    {
      type: 'tool',
      name: 'search_docs',
      input: { query: 'debounce' },
      output: { hits: 2 },
      state: 'done',
    },
    { type: 'text', text: 'Here it is.', state: 'done' },
  ],
};

const defaultProps: AssistantThreadProps = { messages: [prompt, answer] };

beforeEach(() => {
  markdownRenders.length = 0;
});

/** Keeps messages in state, so updates re-render the thread but not the MantineProvider around it */
function setup(initial: AssistantMessage[], props: Partial<AssistantThreadProps> = {}) {
  let update: (messages: AssistantMessage[]) => void = () => {};

  function Harness() {
    const [messages, setMessages] = useState(initial);
    update = setMessages;
    return <AssistantThread messages={messages} {...props} />;
  }

  const view = render(<Harness />);
  return { ...view, update: (messages: AssistantMessage[]) => act(() => update(messages)) };
}

describe('AssistantThread', () => {
  tests.itSupportsSystemProps<AssistantThreadProps, AssistantThreadStylesNames>({
    component: AssistantThread,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'AssistantThread',
    stylesApiSelectors: [
      'root',
      'list',
      'item',
      'turn',
      'bubble',
      'answer',
      'text',
      'step',
      'stepHeader',
      'actions',
    ],
  });

  it('shows prompts as bubbles and answers full width, in a log that does not read tokens', () => {
    render(<AssistantThread {...defaultProps} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
    expect(screen.getByText('Write a debounce hook')).toHaveClass('mantine-AssistantThread-bubble');
    expect(screen.getByText('Here it is.').closest('[data-role]')).toHaveAttribute(
      'data-role',
      'assistant'
    );
  });

  it('passes controlRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListControl>();
    render(<AssistantThread {...defaultProps} controlRef={control} />);
    act(() => control.current!.jumpTo('a1'));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.querySelector('[data-item-id="a1"]'));
    scrollIntoView.mockRestore();
  });

  it('renders an empty log without messages', () => {
    render(<AssistantThread messages={[]} />);
    expect(screen.getByRole('log')).toBeEmptyDOMElement();
  });

  it('renders parts in order, with reasoning and tools as collapsible steps', async () => {
    render(<AssistantThread {...defaultProps} labels={{ thoughts: 'Reasoning' }} />);
    const reasoning = screen.getByRole('button', { name: 'Reasoning' });
    expect(reasoning).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('The user wants a hook.')).not.toBeInTheDocument();
    expect(reasoning.compareDocumentPosition(screen.getByTestId('markdown'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    await userEvent.click(reasoning);
    expect(await screen.findByText('The user wants a hook.')).toBeInTheDocument();
    expect(reasoning).toHaveAttribute('aria-expanded', 'true');
    expect(reasoning).toHaveAttribute('data-expanded');

    const tool = screen.getByRole('button', { name: /search_docs/ });
    expect(tool).toHaveTextContent('Done');
    await userEvent.click(tool);
    expect(await screen.findByText(/"query": "debounce"/)).toBeInTheDocument();
    expect(screen.getByText(/"hits": 2/)).toBeInTheDocument();

    await userEvent.click(reasoning);
    expect(reasoning).toHaveAttribute('aria-expanded', 'false');
  });

  it('labels running and failed tools, and shows an input without output', async () => {
    render(
      <AssistantThread
        messages={[
          prompt,
          {
            ...answer,
            status: 'streaming',
            parts: [
              { type: 'tool', name: 'fetch_page', input: 'https://mantine.dev', state: 'running' },
              { type: 'tool', name: 'run_tests', input: {}, state: 'error' },
            ],
          },
        ]}
        labels={{ running: 'Working', failed: 'Broke', input: 'Args' }}
      />
    );
    expect(screen.getByRole('button', { name: /fetch_page/ })).toHaveTextContent('Working');
    expect(screen.getByRole('button', { name: /run_tests/ })).toHaveTextContent('Broke');

    await userEvent.click(screen.getByRole('button', { name: /fetch_page/ }));
    expect(await screen.findByText('https://mantine.dev')).toBeInTheDocument();
    expect(screen.getByText('Args')).toBeInTheDocument();
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });

  it('waits, streams with a cursor, and announces only the finished answer', () => {
    const streaming: AssistantMessage = { ...answer, status: 'streaming', parts: [] };
    const { update, container } = setup([prompt, streaming], {
      labels: { thinking: 'Working on it' },
    });
    const status = screen.getByRole('status');
    expect(screen.getByLabelText('Working on it')).toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();

    update([
      prompt,
      {
        ...streaming,
        parts: [
          { type: 'reasoning', text: 'Hmm', state: 'streaming' },
          { type: 'text', text: 'Here', state: 'streaming' },
        ],
      },
    ]);
    expect(screen.queryByLabelText('Working on it')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Working on it' })).toBeInTheDocument();
    expect(container.querySelector('.mantine-AssistantThread-text')).toHaveAttribute(
      'data-streaming'
    );
    expect(status).toBeEmptyDOMElement();

    update([
      prompt,
      {
        ...streaming,
        status: 'done',
        parts: [{ type: 'text', text: 'Here it is.', state: 'done' }],
      },
    ]);
    expect(container.querySelector('.mantine-AssistantThread-text')).not.toHaveAttribute(
      'data-streaming'
    );
    expect(status).toHaveTextContent('Here it is.');
  });

  it('does not announce answers that were finished before', () => {
    render(<AssistantThread {...defaultProps} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows an alert with the error', () => {
    render(
      <AssistantThread
        messages={[prompt, { ...answer, status: 'error', error: 'Rate limited', parts: [] }]}
        labels={{ error: 'No answer' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No answer');
    expect(screen.getByRole('alert')).toHaveTextContent('Rate limited');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('renders a finished text part once while a later part streams', () => {
    const parts = (tail: string): AssistantMessage['parts'] => [
      { type: 'text', text: 'Finished part', state: 'done' },
      { type: 'tool', name: 'search', input: {}, state: 'done' },
      { type: 'text', text: tail, state: 'streaming' },
    ];
    const { update } = setup([prompt, { ...answer, status: 'streaming', parts: parts('A') }]);
    update([prompt, { ...answer, status: 'streaming', parts: parts('A b') }]);
    update([prompt, { ...answer, status: 'streaming', parts: parts('A b c') }]);

    const renders = (text: string) =>
      markdownRenders.filter((options) => options.children === text).length;
    expect(renders('Finished part')).toBe(1);
    expect(renders('A b c')).toBe(1);
  });

  it('announces and labels a finished markdown answer as plain text', () => {
    const streaming: AssistantMessage = { ...answer, status: 'streaming', parts: [] };
    const { update } = setup([prompt, streaming]);
    update([
      prompt,
      {
        ...streaming,
        status: 'done',
        parts: [{ type: 'text', text: 'Use **useDebouncedValue** and `wait`.', state: 'done' }],
      },
    ]);
    expect(screen.getByRole('status')).toHaveTextContent(/^Use useDebouncedValue and wait\.$/);
    expect(
      screen.getByRole('button', { name: 'Copy: Use useDebouncedValue and wait.' })
    ).toBeInTheDocument();
  });
});

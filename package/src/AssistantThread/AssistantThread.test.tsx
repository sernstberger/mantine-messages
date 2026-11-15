import { render, screen, tests } from '@mantine-tests/core';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import type { MessageListHandlers } from '../MessageList/MessageList';
import type { AssistantMessage } from '../types';
import {
  AssistantThread,
  AssistantThreadProps,
  AssistantThreadStylesNames,
} from './AssistantThread';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';

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

const busyProps: AssistantThreadProps = {
  messages: [
    prompt,
    answer,
    { ...answer, id: 'a2', status: 'streaming', parts: [] },
    { ...answer, id: 'a3', status: 'error', error: 'Rate limited', parts: [] },
  ],
  onRegenerate: () => {},
  onEdit: () => {},
};

const selectorNames = [
  'stepLabel',
  'stepChevron',
  'stepBadge',
  'stepCaption',
  'stepCode',
  'editor',
  'editorInput',
  'editorActions',
];

const selectorClassNames = Object.fromEntries(
  selectorNames.map((name) => [name, `mantine-AssistantThread-${name}`])
);

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-AssistantThread-root')!;

beforeEach(() => {
  markdownRenders.length = 0;
});

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
    props: busyProps,
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
      'thinking',
      'step',
      'stepHeader',
      'stepLabel',
      'stepChevron',
      'error',
      'retry',
      'actions',
    ],
  });

  tests.axe([<AssistantThread {...defaultProps} />, <AssistantThread {...busyProps} />]);

  itHasStaticVarsResolver({ component: AssistantThread });

  itSupportsAttributes({
    component: AssistantThread,
    props: defaultProps,
    name: 'AssistantThread',
    selector: 'turn',
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

  it('passes handlersRef to the inner MessageList', () => {
    const scrollIntoView = jest.spyOn(Element.prototype, 'scrollIntoView');
    const control = React.createRef<MessageListHandlers>();
    render(<AssistantThread {...defaultProps} handlersRef={control} />);
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
    expect(screen.getByText('Done').closest('.mantine-Badge-root')).toHaveClass(
      'mantine-AssistantThread-stepBadge'
    );
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
    expect(screen.getByRole('img', { name: 'Working on it' })).toBeInTheDocument();
    expect(status).toHaveTextContent('Working on it');

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
    expect(status).toHaveTextContent('Working on it');

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

  it('sets no theming variables by default', () => {
    const { container } = render(<AssistantThread {...defaultProps} />);
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--assistant-thread-prompt-radius')).toBe('');
    expect(root.style.getPropertyValue('--assistant-thread-max-width')).toBe('');
    expect(root.style.getPropertyValue('--assistant-thread-prompt-max-width')).toBe('');
  });

  it('sets the prompt radius variable from radius', () => {
    const { container } = render(<AssistantThread {...defaultProps} radius="xs" />);
    expect(getRoot(container).style.getPropertyValue('--assistant-thread-prompt-radius')).toBe(
      'var(--mantine-radius-xs)'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <AssistantThread
        {...defaultProps}
        vars={() => ({
          root: {
            '--assistant-thread-max-width': '40rem',
            '--assistant-thread-prompt-max-width': '60%',
          },
        })}
      />
    );
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--assistant-thread-max-width')).toBe('40rem');
    expect(root.style.getPropertyValue('--assistant-thread-prompt-max-width')).toBe('60%');
  });

  it('puts the selectors of open steps and of the prompt editor on their elements', async () => {
    const { container } = render(
      <AssistantThread {...defaultProps} onEdit={() => {}} classNames={selectorClassNames} />
    );
    await userEvent.click(screen.getByRole('button', { name: /search_docs/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));

    const has = (selector: string) =>
      container.querySelector(`.mantine-AssistantThread-${selector}`);
    expect(screen.getByText('search_docs')).toHaveAttribute('data-tool');
    expect(has('stepChevron')).toBeInTheDocument();
    expect(has('stepBadge')).toHaveTextContent('Done');
    expect(has('stepCaption')).toHaveTextContent('Input');
    expect(has('stepCode')).toBeInTheDocument();
    expect(has('editor')).toBeInTheDocument();
    expect(has('editorInput')).toBe(screen.getByRole('textbox', { name: 'Edit message' }));
    expect(has('editorActions')).toContainElement(screen.getByRole('button', { name: 'Send' }));
  });

  it('retries from the retry button', async () => {
    const onRegenerate = jest.fn();
    render(<AssistantThread {...busyProps} onRegenerate={onRegenerate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRegenerate).toHaveBeenCalledWith(busyProps.messages[3]);
  });

  it('passes unstyled to the components it renders', async () => {
    const { container } = render(<AssistantThread {...busyProps} unstyled />);
    await userEvent.click(screen.getByRole('button', { name: /search_docs/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit: Write a debounce hook' }));

    const nested = '.mantine-MessageActions-root, .mantine-MarkdownBody-root';
    const names = [
      'Alert',
      'Badge',
      'Button',
      'Code',
      'MarkdownBody',
      'MessageActions',
      'Text',
      'Textarea',
    ];

    for (const name of names) {
      const elements = [...container.querySelectorAll(`.mantine-${name}-root`)].filter(
        (element) => !element.parentElement!.closest(nested)
      );
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((cls) => !cls.startsWith('mantine-'))).toEqual([]);
      }
    }
  });
});

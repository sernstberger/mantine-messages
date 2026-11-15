import { Badge, Box, Group, Paper, Switch, Text } from '@mantine/core';
import React, { useEffect, useRef, useState } from 'react';
import { getAssistantText } from './assistant-text';
import { AssistantThread } from './AssistantThread';
import { Composer, type ComposerDraft } from '../Composer/Composer';
import type { AssistantMessage, AssistantPart } from '../types';
import { MarkdownAdapterProvider } from '../MarkdownBody/MarkdownAdapterProvider';
import { markdownAdapter } from '../../../.storybook/markdown-adapter';

export default {
  title: 'AssistantThread',
  decorators: [
    (Story: React.ComponentType) => (
      <MarkdownAdapterProvider adapter={markdownAdapter}>
        <Story />
      </MarkdownAdapterProvider>
    ),
  ],
};

const ANSWER = [
  'Debounce the **value**, not the handler. This hook waits until the value stops changing:',
  '',
  '```tsx',
  "import { useEffect, useState } from 'react';",
  '',
  'export function useDebouncedValue<T>(value: T, wait = 300) {',
  '  const [debounced, setDebounced] = useState(value);',
  '',
  '  useEffect(() => {',
  '    const timer = window.setTimeout(() => setDebounced(value), wait);',
  '    return () => window.clearTimeout(timer);',
  '  }, [value, wait]);',
  '',
  '  return debounced;',
  '}',
  '```',
  '',
  'A few things to know:',
  '',
  '- The timer restarts on every change, so only the **last** value comes through',
  '- `wait` is in milliseconds; 300 suits a search box',
  '- Mantine already ships one: [use-debounced-value](https://mantine.dev/hooks/use-debounced-value/)',
  '',
  '| Wait | Feels like |',
  '| --- | --- |',
  '| 150 ms | instant |',
  '| 300 ms | calm |',
].join('\n');

const RESULTS = {
  results: [
    { title: 'use-debounced-value', url: 'https://mantine.dev/hooks/use-debounced-value/' },
  ],
};

type Step = (message: AssistantMessage) => AssistantMessage;

function updateLast(
  message: AssistantMessage,
  update: (part: AssistantPart) => AssistantPart
): AssistantMessage {
  const parts = [...message.parts];
  parts[parts.length - 1] = update(parts[parts.length - 1]);
  return { ...message, parts };
}

const pause: Step = (message) => message;

const add =
  (part: AssistantPart): Step =>
  (message) => ({ ...message, parts: [...message.parts, part] });

const append =
  (text: string): Step =>
  (message) =>
    updateLast(message, (part) =>
      part.type === 'tool' ? part : { ...part, text: `${part.text}${text}` }
    );

const settle = (part: AssistantPart): AssistantPart =>
  part.type === 'tool' ? part : { ...part, state: 'done' };

const stopPart = (part: AssistantPart): AssistantPart => {
  if (part.type !== 'tool') {
    return { ...part, state: 'done' };
  }

  return part.state === 'running' ? { ...part, state: 'error', output: 'Stopped' } : part;
};

const tokens = (text: string) => text.match(/\s*\S+/g) ?? [];

function script(prompt: string, fail: boolean): Step[] {
  const reasoning = `They asked: "${prompt}". A hook that delays a changing value fits. Check the Mantine docs for an existing one, then show the code and the gotchas.`;

  return [
    ...Array<Step>(15).fill(pause),
    add({ type: 'reasoning', text: '', state: 'streaming' }),
    ...tokens(reasoning).map(append),
    (message) => updateLast(message, settle),
    add({
      type: 'tool',
      name: 'search_docs',
      input: { query: 'debounce hook', site: 'mantine.dev' },
      state: 'running',
    }),
    ...Array<Step>(30).fill(pause),
    (message) =>
      updateLast(message, (part) =>
        part.type === 'tool' ? { ...part, state: 'done', output: RESULTS } : part
      ),
    add({ type: 'text', text: '', state: 'streaming' }),
    ...tokens(fail ? ANSWER.slice(0, 180) : ANSWER).map(append),
    fail
      ? (message) => ({
          ...updateLast(message, settle),
          status: 'error',
          error: 'The model is overloaded. Try again in a moment.',
        })
      : (message) => ({ ...updateLast(message, settle), status: 'done' }),
  ];
}

const answerShell = (id: string): AssistantMessage => ({
  id,
  authorId: 'assistant',
  role: 'assistant',
  createdAt: new Date(),
  status: 'streaming',
  parts: [],
});

const prompt = (id: string, text: string): AssistantMessage => ({
  id,
  authorId: 'me',
  role: 'user',
  createdAt: new Date(),
  parts: [{ type: 'text', text }],
});

const FIRST = 'How do I debounce a search box in React?';

const initialMessages: AssistantMessage[] = [
  prompt('prompt-0', FIRST),
  script(FIRST, false).reduce((message, step) => step(message), answerShell('answer-0')),
];

function useFakeAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [fail, setFail] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const count = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

  const run = (history: AssistantMessage[]) => {
    clearInterval(timer.current);
    count.current += 1;
    const steps = script(getAssistantText(history[history.length - 1]), fail);
    let message = answerShell(`answer-${count.current}`);
    let index = 0;
    setMessages([...history, message]);

    timer.current = setInterval(() => {
      message = steps[index](message);
      index += 1;

      if (index === steps.length) {
        clearInterval(timer.current);
      }

      setMessages([...history, message]);
    }, 30);
  };

  const stop = () => {
    clearInterval(timer.current);
    setMessages((current) =>
      current.map((message) =>
        message.status === 'streaming'
          ? { ...message, status: 'done', parts: message.parts.map(stopPart) }
          : message
      )
    );
  };

  const send = ({ text }: ComposerDraft) => {
    count.current += 1;
    run([...messages, prompt(`prompt-${count.current}`, text)]);
  };

  const regenerate = (message: AssistantMessage) =>
    run(messages.slice(0, messages.indexOf(message)));

  const edit = (message: AssistantMessage, text: string) =>
    run([
      ...messages.slice(0, messages.indexOf(message)),
      { ...message, parts: [{ type: 'text', text }] },
    ]);

  const streaming = messages[messages.length - 1]?.status === 'streaming';
  return { messages, streaming, fail, setFail, send, stop, regenerate, edit };
}

/** Ask anything: the answer streams in token by token, with a reasoning step and a tool call */
export function Assistant() {
  const { messages, streaming, fail, setFail, send, stop, regenerate, edit } = useFakeAssistant();

  return (
    <Box p="xl">
      <Paper
        withBorder
        radius="lg"
        h={720}
        maw={900}
        mx="auto"
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Group
          justify="space-between"
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group gap="xs">
            <Text fw={600}>Assistant</Text>
            <Badge variant="light" size="sm">
              Fake stream
            </Badge>
          </Group>
          <Switch
            size="xs"
            label="Fail the next answer"
            checked={fail}
            onChange={(event) => setFail(event.currentTarget.checked)}
          />
        </Group>
        <AssistantThread
          messages={messages}
          onRegenerate={regenerate}
          onEdit={edit}
          style={{ flex: 1 }}
        />
        <Box px="md" pb="md" pt="xs" w="100%" maw={800} mx="auto">
          <Composer
            placeholder="Ask anything"
            format="markdown"
            streaming={streaming}
            onStop={stop}
            onSend={send}
          />
          <Text size="xs" c="dimmed" ta="center" mt={6}>
            Answers come from a canned script, streamed every 30 ms.
          </Text>
        </Box>
      </Paper>
    </Box>
  );
}

/** Still frames: a failed answer, then one mid-stream with a running tool and a cursor */
export function States() {
  const messages: AssistantMessage[] = [
    prompt('s1', 'Summarise the release notes'),
    {
      ...answerShell('s2'),
      status: 'error',
      error: 'The model is overloaded. Try again in a moment.',
      parts: [{ type: 'text', text: 'The release adds', state: 'done' }],
    },
    prompt('s3', 'Check the build for me'),
    {
      ...answerShell('s4'),
      parts: [
        { type: 'reasoning', text: 'Run the tests first.', state: 'done' },
        { type: 'tool', name: 'run_tests', input: { filter: 'Composer' }, state: 'running' },
        { type: 'text', text: 'Running the Composer tests now, then', state: 'streaming' },
      ],
    },
  ];

  return (
    <Box p="xl" maw={900} mx="auto">
      <Paper withBorder radius="lg" h={560} style={{ display: 'flex', flexDirection: 'column' }}>
        <AssistantThread messages={messages} onRegenerate={() => {}} style={{ flex: 1 }} />
        <Composer m="md" streaming onStop={() => {}} />
      </Paper>
    </Box>
  );
}

import { Paper } from '@mantine/core';
import { MantineDemo } from '@mantinex/demo';
import { AssistantMessage, AssistantPart, Composer, ComposerDraft } from 'mantine-messages';
import { AssistantThread } from 'mantine-messages/assistant';
import React, { useEffect, useRef, useState } from 'react';

const reply = `Debounce the **value**, not the handler:

\`\`\`tsx
const [search, setSearch] = useState('');
const [debounced] = useDebouncedValue(search, 300);
\`\`\`

Then fetch when \`debounced\` changes. Mantine ships [useDebouncedValue](https://mantine.dev/hooks/use-debounced-value/).`;

const code = `
import { useRef, useState } from 'react';
import { Paper } from '@mantine/core';
import { Composer, type AssistantMessage } from 'mantine-messages';
import { AssistantThread } from 'mantine-messages/assistant';

function Demo() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const streaming = messages.at(-1)?.status === 'streaming';

  // Your model client: append each token to the last text part of the last answer,
  // then set status to 'done' (or 'error' with an error text)
  const ask = (history: AssistantMessage[]) => streamAnswer(history, setMessages);

  return (
    <Paper withBorder radius="lg" h={520} style={{ display: 'flex', flexDirection: 'column' }}>
      <AssistantThread
        messages={messages}
        onRegenerate={(message) => ask(messages.slice(0, messages.indexOf(message)))}
        onEdit={(message, text) =>
          ask([
            ...messages.slice(0, messages.indexOf(message)),
            { ...message, parts: [{ type: 'text', text }] },
          ])
        }
        style={{ flex: 1 }}
      />
      <Composer
        m="sm"
        placeholder="Ask anything"
        streaming={streaming}
        onStop={stopAnswer}
        onSend={({ text }) =>
          ask([
            ...messages,
            { id: crypto.randomUUID(), authorId: 'me', role: 'user', createdAt: new Date(), parts: [{ type: 'text', text }] },
          ])
        }
      />
    </Paper>
  );
}
`;

const finishPart = (part: AssistantPart): AssistantPart =>
  part.type === 'tool' ? part : { ...part, state: 'done' };

function Demo() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const count = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

  const ask = (history: AssistantMessage[]) => {
    clearInterval(timer.current);
    count.current += 1;
    const id = `answer-${count.current}`;
    const words = reply.match(/\s*\S+/g) ?? [];
    let shown = 0;

    const answer = (status: AssistantMessage['status']): AssistantMessage => ({
      id,
      authorId: 'assistant',
      role: 'assistant',
      createdAt: new Date(),
      status,
      parts: [
        {
          type: 'text',
          text: words.slice(0, shown).join(''),
          state: status === 'streaming' ? 'streaming' : 'done',
        },
      ],
    });

    setMessages([...history, answer('streaming')]);
    timer.current = setInterval(() => {
      shown += 1;
      const done = shown >= words.length;

      if (done) {
        clearInterval(timer.current);
      }

      setMessages([...history, answer(done ? 'done' : 'streaming')]);
    }, 40);
  };

  const stop = () => {
    clearInterval(timer.current);
    setMessages((current) =>
      current.map((message) =>
        message.status === 'streaming'
          ? { ...message, status: 'done', parts: message.parts.map(finishPart) }
          : message
      )
    );
  };

  const send = ({ text }: ComposerDraft) => {
    count.current += 1;
    ask([
      ...messages,
      {
        id: `prompt-${count.current}`,
        authorId: 'me',
        role: 'user',
        createdAt: new Date(),
        parts: [{ type: 'text', text }],
      },
    ]);
  };

  return (
    <Paper
      withBorder
      radius="lg"
      h={520}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <AssistantThread
        messages={messages}
        onRegenerate={(message) => ask(messages.slice(0, messages.indexOf(message)))}
        onEdit={(message, text) =>
          ask([
            ...messages.slice(0, messages.indexOf(message)),
            { ...message, parts: [{ type: 'text', text }] },
          ])
        }
        style={{ flex: 1 }}
      />
      <Composer
        m="sm"
        placeholder="Ask how to debounce a search box"
        streaming={messages[messages.length - 1]?.status === 'streaming'}
        onStop={stop}
        onSend={send}
      />
    </Paper>
  );
}

export const assistant: MantineDemo = {
  type: 'code',
  component: Demo,
  code,
};

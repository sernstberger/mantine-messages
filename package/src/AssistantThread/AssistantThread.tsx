import {
  Alert,
  Badge,
  Box,
  BoxProps,
  Button,
  Code,
  Collapse,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  Group,
  Loader,
  StylesApiProps,
  Text,
  Textarea,
  UnstyledButton,
  useMantineTheme,
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import { useDisclosure, useId, useMergedRef } from '@mantine/hooks';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronIcon, RegenerateIcon } from '../icons';
import { MarkdownBody } from '../MarkdownBody/MarkdownBody';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList, type MessageListControl } from '../MessageList/MessageList';
import type { AssistantMessage, AssistantPart } from '../types';
import { stripMarkdown } from '../utils/preview';
import { formatJson, getAssistantText } from './assistant-text';
import classes from './AssistantThread.module.css';

export type AssistantThreadStylesNames =
  | 'root'
  | 'list'
  | 'item'
  | 'turn'
  | 'bubble'
  | 'answer'
  | 'text'
  | 'thinking'
  | 'step'
  | 'stepHeader'
  | 'stepBody'
  | 'stepCode'
  | 'error'
  | 'actions'
  | 'editor';

export interface AssistantThreadLabels {
  copy: string;
  copied: string;

  /** Edit action on prompts */
  edit: string;

  /** Regenerate action on the last answer */
  regenerate: string;

  /** Button in the error alert */
  retry: string;

  /** Title of the error alert */
  error: string;

  /** Reasoning step while it streams, and the indicator before the first part arrives */
  thinking: string;

  /** Reasoning step once finished */
  thoughts: string;

  /** Tool states */
  running: string;
  done: string;
  failed: string;

  /** Captions above a tool's input and output */
  input: string;
  output: string;

  /** Accessible label of the box that edits a prompt */
  editPrompt: string;
  cancel: string;
  send: string;
}

export interface AssistantThreadProps
  extends BoxProps, StylesApiProps<AssistantThreadFactory>, ElementProps<'div'> {
  /** Prompts and answers, oldest first; update the last part of the last answer as tokens arrive */
  messages: AssistantMessage[];

  /** Keep the newest answer in view, following it as it streams, `true` by default */
  autoScroll?: boolean;

  /** Called to answer again; shows Regenerate on the last answer and Retry when it failed */
  onRegenerate?: (message: AssistantMessage) => void;

  /** Called with the new text when the user edits a prompt; shows Edit on prompts */
  onEdit?: (message: AssistantMessage, text: string) => void;

  /** Text, for translation */
  labels?: Partial<AssistantThreadLabels>;

  /** Gets `{ jumpTo }` of the inner `MessageList`, to scroll to a message and flash it */
  controlRef?: React.Ref<MessageListControl>;
}

export type AssistantThreadFactory = Factory<{
  props: AssistantThreadProps;
  ref: HTMLDivElement;
  stylesNames: AssistantThreadStylesNames;
}>;

type GetStyles = GetStylesApi<AssistantThreadFactory>;
type ToolPart = Extract<AssistantPart, { type: 'tool' }>;

const defaultLabels: AssistantThreadLabels = {
  copy: 'Copy',
  copied: 'Copied',
  edit: 'Edit',
  regenerate: 'Regenerate',
  retry: 'Retry',
  error: 'Something went wrong',
  thinking: 'Thinking…',
  thoughts: 'Thought process',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  input: 'Input',
  output: 'Output',
  editPrompt: 'Edit message',
  cancel: 'Cancel',
  send: 'Send',
};

const defaultProps: Partial<AssistantThreadProps> = { autoScroll: true };

const toolColors = { running: 'blue', done: 'teal', error: 'red' } as const;

// Parts of the inner MessageList that AssistantThread's Styles API also styles
const listParts = ['list', 'item'] as const;

/**
 * One text part. The markdown element is memoized on the text: when only a later part changes,
 * React reuses the element and skips MarkdownBody, so finished parts are never parsed again
 */
function TextPart({
  text,
  streaming,
  getStyles,
}: {
  text: string;
  streaming: boolean;
  getStyles: GetStyles;
}) {
  const body = useMemo(() => <MarkdownBody>{text}</MarkdownBody>, [text]);

  return (
    <Box mod={{ streaming }} {...getStyles('text')}>
      {body}
    </Box>
  );
}

/** A reasoning or tool step: a header button that shows and hides the body */
function Step({
  label,
  badge,
  children,
  getStyles,
}: {
  label: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  getStyles: GetStyles;
}) {
  const [expanded, { toggle }] = useDisclosure(false);
  const id = useId();

  return (
    <Box {...getStyles('step')}>
      <UnstyledButton
        aria-expanded={expanded}
        aria-controls={id}
        onClick={toggle}
        mod={{ expanded }}
        {...getStyles('stepHeader')}
      >
        <ChevronIcon size={14} />
        {label}
        {badge}
      </UnstyledButton>
      <Collapse id={id} expanded={expanded} keepMounted={false}>
        <Box {...getStyles('stepBody')}>{children}</Box>
      </Collapse>
    </Box>
  );
}

/** Input and output of a tool; only rendered while its step is open */
function ToolDetails({
  part,
  labels,
  getStyles,
}: {
  part: ToolPart;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
}) {
  return (
    <>
      <Text size="xs" fw={500}>
        {labels.input}
      </Text>
      <Code block {...getStyles('stepCode')}>
        {formatJson(part.input)}
      </Code>
      {part.output !== undefined && (
        <>
          <Text size="xs" fw={500}>
            {labels.output}
          </Text>
          <Code block {...getStyles('stepCode')}>
            {formatJson(part.output)}
          </Code>
        </>
      )}
    </>
  );
}

/** A prompt being edited: Enter or Send submits the trimmed text, Escape or Cancel closes */
function PromptEditor({
  defaultValue,
  labels,
  onCancel,
  onSubmit,
  getStyles,
}: {
  defaultValue: string;
  labels: AssistantThreadLabels;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  getStyles: GetStyles;
}) {
  const [value, setValue] = useState(defaultValue);
  const text = value.trim();

  const submit = () => {
    if (text) {
      onSubmit(text);
    }
  };

  return (
    <Box {...getStyles('editor')}>
      <Textarea
        autosize
        autoFocus
        minRows={1}
        maxRows={10}
        aria-label={labels.editPrompt}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <Group justify="flex-end" gap="xs" mt="xs">
        <Button variant="default" size="xs" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button size="xs" disabled={!text} onClick={submit}>
          {labels.send}
        </Button>
      </Group>
    </Box>
  );
}

/** A text part, or a reasoning or tool step, of an answer */
function Part({
  part,
  labels,
  getStyles,
}: {
  part: AssistantPart;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
}) {
  if (part.type === 'text') {
    return (
      <TextPart text={part.text} streaming={part.state === 'streaming'} getStyles={getStyles} />
    );
  }

  if (part.type === 'reasoning') {
    return (
      <Step
        label={part.state === 'streaming' ? labels.thinking : labels.thoughts}
        getStyles={getStyles}
      >
        {part.text}
      </Step>
    );
  }

  const toolLabels = { running: labels.running, done: labels.done, error: labels.failed };

  return (
    <Step
      getStyles={getStyles}
      label={
        <Text component="span" inherit ff="monospace">
          {part.name}
        </Text>
      }
      badge={
        <Badge
          size="xs"
          variant="light"
          color={toolColors[part.state]}
          ms="auto"
          leftSection={part.state === 'running' ? <Loader size={8} color="blue" /> : null}
        >
          {toolLabels[part.state]}
        </Badge>
      }
    >
      <ToolDetails part={part} labels={labels} getStyles={getStyles} />
    </Step>
  );
}

interface AnswerProps {
  message: AssistantMessage;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;

  /** Set on the last answer when the thread has `onRegenerate` */
  onRegenerate?: (message: AssistantMessage) => void;
}

/**
 * One answer. Memoized, and the thread keeps every prop stable, so while an answer streams the
 * finished answers above it do not render again
 */
const Answer = memo(function Answer({ message, labels, getStyles, onRegenerate }: AnswerProps) {
  const streaming = message.status === 'streaming';
  const text = useMemo(() => getAssistantText(message), [message]);
  const preview = useMemo(() => stripMarkdown(text), [text]);
  const actions: MessageAction[] = ['copy'];

  if (onRegenerate) {
    actions.push({
      id: 'regenerate',
      label: labels.regenerate,
      icon: <RegenerateIcon />,
      onClick: () => onRegenerate(message),
    });
  }

  return (
    <Box
      mod={{ role: 'assistant', status: message.status }}
      aria-busy={streaming || undefined}
      {...getStyles('turn')}
    >
      <Box {...getStyles('answer')}>
        {message.parts.map((part, index) => (
          <Part key={index} part={part} labels={labels} getStyles={getStyles} />
        ))}
        {streaming && message.parts.length === 0 && (
          <Loader
            type="dots"
            size="sm"
            role="img"
            aria-label={labels.thinking}
            {...getStyles('thinking')}
          />
        )}
      </Box>
      {message.status === 'error' && (
        <Alert color="red" variant="light" title={labels.error} {...getStyles('error')}>
          {message.error}
          {onRegenerate && (
            <Button
              display="block"
              mt="xs"
              size="xs"
              variant="light"
              color="red"
              onClick={() => onRegenerate(message)}
            >
              {labels.retry}
            </Button>
          )}
        </Alert>
      )}
      {!streaming && (
        <MessageActions
          actions={actions}
          text={text}
          preview={preview}
          labels={{ copy: labels.copy, copied: labels.copied }}
          {...getStyles('actions')}
        />
      )}
    </Box>
  );
});

interface PromptProps {
  message: AssistantMessage;
  editing: boolean;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;

  /** Set when the prompt can be edited now: the thread has `onEdit` and is not streaming */
  onStartEdit?: (message: AssistantMessage) => void;
  onCancel: (message: AssistantMessage) => void;
  onSubmit: (message: AssistantMessage, text: string) => void;
}

/** One prompt, or its editor. Memoized like `Answer` */
const Prompt = memo(function Prompt({
  message,
  editing,
  labels,
  getStyles,
  onStartEdit,
  onCancel,
  onSubmit,
}: PromptProps) {
  const text = useMemo(() => getAssistantText(message), [message]);

  return (
    // Focusable from code only: focus comes here after an edit is sent
    <Box mod={{ role: 'user' }} tabIndex={-1} {...getStyles('turn')}>
      {editing ? (
        <PromptEditor
          defaultValue={text}
          labels={labels}
          getStyles={getStyles}
          onCancel={() => onCancel(message)}
          onSubmit={(next) => onSubmit(message, next)}
        />
      ) : (
        <>
          <Box {...getStyles('bubble')}>{text}</Box>
          <MessageActions
            actions={['copy', 'edit']}
            text={text}
            labels={{ copy: labels.copy, copied: labels.copied, edit: labels.edit }}
            onEdit={onStartEdit && (() => onStartEdit(message))}
            {...getStyles('actions')}
          />
        </>
      )}
    </Box>
  );
});

/** Where focus goes once a prompt editor closes */
interface FocusAfterEdit {
  id: string;

  /** The prompt's Edit button (after Cancel), or the prompt itself (after sending) */
  target: 'edit' | 'prompt';
}

export const AssistantThread = factory<AssistantThreadFactory>((_props) => {
  const props = useProps('AssistantThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    messages,
    autoScroll,
    onRegenerate,
    onEdit,
    labels,
    controlRef,
    // Off by default: the status region below announces each finished answer once instead
    'aria-live': ariaLive = 'off',
    ...others
  } = props;

  const theme = useMantineTheme();
  const getStyles = useStyles<AssistantThreadFactory>({
    name: 'AssistantThread',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    attributes,
  });

  // Answers and prompts are memoized; what they get stays the same from one token to the next.
  // getStyles is a new function on every render, but for the inner parts it returns only what
  // these inputs decide (className and style go to the root alone)
  const partStyles = useMemo(
    () => getStyles,
    [theme, classNames, styles, unstyled, vars, attributes]
  );
  const labelsKey = JSON.stringify(labels ?? {});
  const allLabels = useMemo(() => ({ ...defaultLabels, ...labels }), [labelsKey]);

  // The latest callbacks, called through stable functions, so callbacks written inline by the
  // app do not render every answer again on every token
  const latest = useRef({ onRegenerate, onEdit });
  latest.current = { onRegenerate, onEdit };
  const regenerate = useCallback(
    (message: AssistantMessage) => latest.current.onRegenerate!(message),
    []
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const last = messages[messages.length - 1];
  const busy = last?.status === 'streaming';

  // When an edit closes, focus goes back to the prompt instead of falling to the page
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, rootRef);
  const focusAfterEdit = useRef<FocusAfterEdit | null>(null);

  const startEdit = useCallback((message: AssistantMessage) => setEditingId(message.id), []);
  const cancelEdit = useCallback((message: AssistantMessage) => {
    focusAfterEdit.current = { id: message.id, target: 'edit' };
    setEditingId(null);
  }, []);
  const submitEdit = useCallback((message: AssistantMessage, text: string) => {
    focusAfterEdit.current = { id: message.id, target: 'prompt' };
    setEditingId(null);
    latest.current.onEdit!(message, text);
  }, []);

  useEffect(() => {
    const pending = focusAfterEdit.current;

    if (!pending) {
      return;
    }

    focusAfterEdit.current = null;
    const prompts = Array.from(
      rootRef.current!.querySelectorAll<HTMLElement>('[data-item-id] > [data-role="user"]')
    );
    // The edited prompt, or the newest one when the app replaced it with a new message
    const prompt =
      prompts.find((element) => element.parentElement!.dataset.itemId === pending.id) ??
      prompts[prompts.length - 1];
    const edit = Array.from(prompt?.querySelectorAll('button') ?? []).find((button) =>
      String(button.getAttribute('aria-label')).startsWith(`${allLabels.edit}:`)
    );
    (pending.target === 'edit' && edit ? edit : prompt)?.focus();
  });

  // The log is aria-live="off", so tokens are not read out. The status region says "Thinking"
  // once when an answer starts and reads the answer's text once when it finishes; errors are
  // read by the Alert (role="alert")
  const [announcement, setAnnouncement] = useState('');
  const streamingId = useRef<string | null>(null);

  useEffect(() => {
    if (busy) {
      if (streamingId.current !== last.id) {
        streamingId.current = last.id;
        setAnnouncement(allLabels.thinking);
      }

      return;
    }

    if (last && last.id === streamingId.current) {
      streamingId.current = null;
      // Plain text: a screen reader would read markdown's asterisks and backticks aloud
      setAnnouncement(last.status === 'error' ? '' : stripMarkdown(getAssistantText(last)));
    }
  });

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <>
      <MessageList<AssistantMessage>
        ref={mergedRef}
        controlRef={controlRef}
        items={messages}
        isOwn={(message) => message.role === 'user'}
        withDateDividers={false}
        autoScroll={autoScroll}
        aria-live={ariaLive}
        unstyled={unstyled}
        classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
        styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
        {...getStyles('root')}
        {...others}
        renderItem={(message) =>
          message.role === 'user' ? (
            <Prompt
              message={message}
              editing={message.id === editingId}
              labels={allLabels}
              getStyles={partStyles}
              onStartEdit={onEdit && !busy ? startEdit : undefined}
              onCancel={cancelEdit}
              onSubmit={submitEdit}
            />
          ) : (
            <Answer
              message={message}
              labels={allLabels}
              getStyles={partStyles}
              onRegenerate={onRegenerate && message.id === last.id ? regenerate : undefined}
            />
          )
        }
      />
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </>
  );
});

AssistantThread.displayName = 'AssistantThread';
AssistantThread.classes = classes;

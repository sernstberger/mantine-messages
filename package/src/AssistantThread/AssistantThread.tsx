import {
  Alert,
  Badge,
  Box,
  BoxProps,
  Button,
  Code,
  Collapse,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getRadius,
  GetStylesApi,
  Group,
  Loader,
  MantineRadius,
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
import {
  MessageList,
  type MessageListHandlers,
  type MessageListRowsProps,
} from '../MessageList/MessageList';
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
  | 'stepLabel'
  | 'stepChevron'
  | 'stepBadge'
  | 'stepBody'
  | 'stepCaption'
  | 'stepCode'
  | 'error'
  | 'retry'
  | 'actions'
  | 'editor'
  | 'editorInput'
  | 'editorActions';

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

  /**
   * Keep the newest answer in view, following it as it streams
   * @default true
   */
  autoScroll?: boolean;

  /** Called to answer again; shows Regenerate on the last answer and Retry when it failed */
  onRegenerate?: (message: AssistantMessage) => void;

  /** Called with the new text when the user edits a prompt; shows Edit on prompts */
  onEdit?: (message: AssistantMessage, text: string) => void;

  /** Text, for translation */
  labels?: Partial<AssistantThreadLabels>;

  /** Gets `{ jumpTo }` of the inner `MessageList`, to scroll to a message and flash it */
  handlersRef?: React.Ref<MessageListHandlers>;

  /**
   * Renders the rows of the inner `MessageList`, every row by default; set it to window threads of
   * thousands of messages (see "Long threads")
   */
  rowsComponent?: React.ComponentType<MessageListRowsProps>;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of prompt bubbles, numbers are converted to rem @default 'xl' */
  radius?: MantineRadius;
}

export type AssistantThreadCssVariables = {
  root:
    | '--assistant-thread-prompt-radius'
    | '--assistant-thread-max-width'
    | '--assistant-thread-prompt-max-width';
};

export type AssistantThreadFactory = Factory<{
  props: AssistantThreadProps;
  ref: HTMLDivElement;
  stylesNames: AssistantThreadStylesNames;
  vars: AssistantThreadCssVariables;
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

const defaultProps = { autoScroll: true } satisfies Partial<AssistantThreadProps>;

const varsResolver = createVarsResolver<AssistantThreadFactory>((_theme, { radius }) => ({
  root: {
    '--assistant-thread-prompt-radius': radius === undefined ? undefined : getRadius(radius),
    '--assistant-thread-max-width': undefined,
    '--assistant-thread-prompt-max-width': undefined,
  },
}));

const toolColors = { running: 'blue', done: 'teal', error: 'red' } as const;

const listParts = ['list', 'item'] as const;

function TextPart({
  text,
  streaming,
  getStyles,
  unstyled,
}: {
  text: string;
  streaming: boolean;
  getStyles: GetStyles;
  unstyled?: boolean;
}) {
  // Memoized on the text: when a later part changes, React skips MarkdownBody for this one
  const body = useMemo(
    () => <MarkdownBody unstyled={unstyled}>{text}</MarkdownBody>,
    [text, unstyled]
  );

  return (
    <Box mod={{ streaming }} {...getStyles('text')}>
      {body}
    </Box>
  );
}

function Step({
  label,
  badge,
  tool,
  children,
  getStyles,
  unstyled,
}: {
  label: React.ReactNode;
  badge?: React.ReactNode;
  tool?: boolean;
  children: React.ReactNode;
  getStyles: GetStyles;
  unstyled?: boolean;
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
        unstyled={unstyled}
        {...getStyles('stepHeader')}
      >
        <Box component="span" mod={{ expanded }} {...getStyles('stepChevron')}>
          <ChevronIcon size={14} />
        </Box>
        <Box component="span" mod={{ tool }} {...getStyles('stepLabel')}>
          {label}
        </Box>
        {badge}
      </UnstyledButton>
      <Collapse id={id} expanded={expanded} keepMounted={false}>
        <Box {...getStyles('stepBody')}>{children}</Box>
      </Collapse>
    </Box>
  );
}

function ToolDetails({
  part,
  labels,
  getStyles,
  unstyled,
}: {
  part: ToolPart;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
  unstyled?: boolean;
}) {
  return (
    <>
      <Text size="xs" unstyled={unstyled} {...getStyles('stepCaption')}>
        {labels.input}
      </Text>
      <Code block unstyled={unstyled} {...getStyles('stepCode')}>
        {formatJson(part.input)}
      </Code>
      {part.output !== undefined && (
        <>
          <Text size="xs" unstyled={unstyled} {...getStyles('stepCaption')}>
            {labels.output}
          </Text>
          <Code block unstyled={unstyled} {...getStyles('stepCode')}>
            {formatJson(part.output)}
          </Code>
        </>
      )}
    </>
  );
}

function PromptEditor({
  defaultValue,
  labels,
  onCancel,
  onSubmit,
  getStyles,
  unstyled,
}: {
  defaultValue: string;
  labels: AssistantThreadLabels;
  onCancel: () => void;
  onSubmit: (text: string) => void;
  getStyles: GetStyles;
  unstyled?: boolean;
}) {
  const {
    className: inputClassName,
    style: inputStyle,
    ...inputAttributes
  } = getStyles('editorInput');
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
        unstyled={unstyled}
        classNames={{ input: inputClassName }}
        styles={{ input: inputStyle }}
        attributes={{ input: inputAttributes }}
        autosize
        autoFocus
        minRows={1}
        maxRows={10}
        aria-label={labels.editPrompt}
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
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
      <Group justify="flex-end" gap="xs" unstyled={unstyled} {...getStyles('editorActions')}>
        <Button variant="default" size="xs" unstyled={unstyled} onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button size="xs" unstyled={unstyled} disabled={!text} onClick={submit}>
          {labels.send}
        </Button>
      </Group>
    </Box>
  );
}

function Part({
  part,
  labels,
  getStyles,
  unstyled,
}: {
  part: AssistantPart;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
  unstyled?: boolean;
}) {
  if (part.type === 'text') {
    return (
      <TextPart
        text={part.text}
        streaming={part.state === 'streaming'}
        getStyles={getStyles}
        unstyled={unstyled}
      />
    );
  }

  if (part.type === 'reasoning') {
    return (
      <Step
        label={part.state === 'streaming' ? labels.thinking : labels.thoughts}
        getStyles={getStyles}
        unstyled={unstyled}
      >
        {part.text}
      </Step>
    );
  }

  const toolLabels = { running: labels.running, done: labels.done, error: labels.failed };

  return (
    <Step
      tool
      getStyles={getStyles}
      unstyled={unstyled}
      label={part.name}
      badge={
        <Badge
          size="xs"
          variant="light"
          color={toolColors[part.state]}
          unstyled={unstyled}
          leftSection={
            part.state === 'running' ? <Loader size={8} color="blue" unstyled={unstyled} /> : null
          }
          {...getStyles('stepBadge')}
        >
          {toolLabels[part.state]}
        </Badge>
      }
    >
      <ToolDetails part={part} labels={labels} getStyles={getStyles} unstyled={unstyled} />
    </Step>
  );
}

interface AnswerProps {
  message: AssistantMessage;
  labels: AssistantThreadLabels;
  getStyles: GetStyles;
  unstyled?: boolean;

  onRegenerate?: (message: AssistantMessage) => void;
}

const Answer = memo(function Answer({
  message,
  labels,
  getStyles,
  unstyled,
  onRegenerate,
}: AnswerProps) {
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
          <Part key={index} part={part} labels={labels} getStyles={getStyles} unstyled={unstyled} />
        ))}
        {streaming && message.parts.length === 0 && (
          <Loader
            type="dots"
            size="sm"
            role="img"
            aria-label={labels.thinking}
            unstyled={unstyled}
            {...getStyles('thinking')}
          />
        )}
      </Box>
      {message.status === 'error' && (
        <Alert
          color="red"
          variant="light"
          title={labels.error}
          unstyled={unstyled}
          {...getStyles('error')}
        >
          {message.error}
          {onRegenerate && (
            <Button
              size="xs"
              variant="light"
              color="red"
              unstyled={unstyled}
              onClick={() => onRegenerate(message)}
              {...getStyles('retry')}
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
          unstyled={unstyled}
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
  unstyled?: boolean;

  onStartEdit?: (message: AssistantMessage) => void;
  onCancel: (message: AssistantMessage) => void;
  onSubmit: (message: AssistantMessage, text: string) => void;
}

const Prompt = memo(function Prompt({
  message,
  editing,
  labels,
  getStyles,
  unstyled,
  onStartEdit,
  onCancel,
  onSubmit,
}: PromptProps) {
  const text = useMemo(() => getAssistantText(message), [message]);

  return (
    // tabIndex -1: focus lands here after an edit is sent
    <Box mod={{ role: 'user' }} tabIndex={-1} {...getStyles('turn', { focusable: true })}>
      {editing ? (
        <PromptEditor
          defaultValue={text}
          labels={labels}
          getStyles={getStyles}
          unstyled={unstyled}
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
            unstyled={unstyled}
            {...getStyles('actions')}
          />
        </>
      )}
    </Box>
  );
});

interface FocusAfterEdit {
  id: string;

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
    handlersRef,
    radius,
    // 'off': the status region below announces each finished answer once instead
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
    varsResolver,
  });

  // Stable across tokens, so memoized parts skip rendering (getStyles is new on every render)
  const partStyles = useMemo(
    () => getStyles,
    [theme, classNames, styles, unstyled, vars, attributes]
  );
  const labelsKey = JSON.stringify(labels ?? {});
  const allLabels = useMemo(() => ({ ...defaultLabels, ...labels }), [labelsKey]);

  // Called through a ref, so inline callbacks do not render every answer on each token
  const latest = useRef({ onRegenerate, onEdit });
  latest.current = { onRegenerate, onEdit };
  const regenerate = useCallback(
    (message: AssistantMessage) => latest.current.onRegenerate!(message),
    []
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const last = messages[messages.length - 1];
  const busy = last?.status === 'streaming';

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
    const prompt =
      prompts.find((element) => element.parentElement!.dataset.itemId === pending.id) ??
      prompts[prompts.length - 1];
    const edit = Array.from(prompt?.querySelectorAll('button') ?? []).find((button) =>
      String(button.getAttribute('aria-label')).startsWith(`${allLabels.edit}:`)
    );
    (pending.target === 'edit' && edit ? edit : prompt)?.focus();
  });

  // The log is aria-live="off": this region says "Thinking" once, then the finished answer once
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
      // Plain text: markdown's asterisks and backticks would be read aloud
      setAnnouncement(last.status === 'error' ? '' : stripMarkdown(getAssistantText(last)));
    }
  });

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <>
      <MessageList<AssistantMessage>
        ref={mergedRef}
        handlersRef={handlersRef}
        items={messages}
        isOwn={(message) => message.role === 'user'}
        withDateDividers={false}
        autoScroll={autoScroll}
        aria-live={ariaLive}
        unstyled={unstyled}
        classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
        styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
        attributes={Object.fromEntries(
          listParts.map((part) => {
            const { className: _className, style: _style, ...rest } = listStyles[part];
            return [part, rest];
          })
        )}
        {...getStyles('root')}
        {...others}
        renderItem={(message) =>
          message.role === 'user' ? (
            <Prompt
              message={message}
              editing={message.id === editingId}
              labels={allLabels}
              getStyles={partStyles}
              unstyled={unstyled}
              onStartEdit={onEdit && !busy ? startEdit : undefined}
              onCancel={cancelEdit}
              onSubmit={submitEdit}
            />
          ) : (
            <Answer
              message={message}
              labels={allLabels}
              getStyles={partStyles}
              unstyled={unstyled}
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
AssistantThread.varsResolver = varsResolver;

export namespace AssistantThread {
  export type Props = AssistantThreadProps;
  export type StylesNames = AssistantThreadStylesNames;
  export type Factory = AssistantThreadFactory;
  export type CssVariables = AssistantThreadCssVariables;
  export type Labels = AssistantThreadLabels;
}

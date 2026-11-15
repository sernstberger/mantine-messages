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
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import { useDisclosure, useId } from '@mantine/hooks';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export const AssistantThread = factory<AssistantThreadFactory>((_props) => {
  const props = useProps('AssistantThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
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
  });

  const allLabels = { ...defaultLabels, ...labels };
  const toolLabels = { running: allLabels.running, done: allLabels.done, error: allLabels.failed };
  const [editingId, setEditingId] = useState<string | null>(null);
  const last = messages[messages.length - 1];
  const busy = last?.status === 'streaming';

  // The log is aria-live="off", so tokens are not read out. When an answer finishes streaming its
  // text goes to the status region and is read once; errors are read by the Alert (role="alert")
  const [announcement, setAnnouncement] = useState('');
  const streamingId = useRef<string | null>(null);

  useEffect(() => {
    if (busy) {
      streamingId.current = last.id;
      return;
    }

    if (last && last.id === streamingId.current) {
      streamingId.current = null;

      if (last.status !== 'error') {
        // Plain text: a screen reader would read markdown's asterisks and backticks aloud
        setAnnouncement(stripMarkdown(getAssistantText(last)));
      }
    }
  });

  const renderPart = (part: AssistantPart, index: number) => {
    if (part.type === 'text') {
      return (
        <TextPart
          key={index}
          text={part.text}
          streaming={part.state === 'streaming'}
          getStyles={getStyles}
        />
      );
    }

    if (part.type === 'reasoning') {
      return (
        <Step
          key={index}
          label={part.state === 'streaming' ? allLabels.thinking : allLabels.thoughts}
          getStyles={getStyles}
        >
          {part.text}
        </Step>
      );
    }

    return (
      <Step
        key={index}
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
        <ToolDetails part={part} labels={allLabels} getStyles={getStyles} />
      </Step>
    );
  };

  const renderPrompt = (message: AssistantMessage) => {
    const text = getAssistantText(message);

    if (message.id === editingId) {
      return (
        <Box mod={{ role: 'user' }} {...getStyles('turn')}>
          <PromptEditor
            defaultValue={text}
            labels={allLabels}
            getStyles={getStyles}
            onCancel={() => setEditingId(null)}
            onSubmit={(next) => {
              setEditingId(null);
              onEdit!(message, next);
            }}
          />
        </Box>
      );
    }

    return (
      <Box mod={{ role: 'user' }} {...getStyles('turn')}>
        <Box {...getStyles('bubble')}>{text}</Box>
        <MessageActions
          actions={['copy', 'edit']}
          text={text}
          labels={{ copy: allLabels.copy, copied: allLabels.copied, edit: allLabels.edit }}
          onEdit={onEdit && !busy ? () => setEditingId(message.id) : undefined}
          {...getStyles('actions')}
        />
      </Box>
    );
  };

  const renderAnswer = (message: AssistantMessage) => {
    const streaming = message.status === 'streaming';
    const actions: MessageAction[] = ['copy'];

    if (onRegenerate && message.id === last.id) {
      actions.push({
        id: 'regenerate',
        label: allLabels.regenerate,
        icon: <RegenerateIcon />,
        onClick: () => onRegenerate(message),
      });
    }

    return (
      <Box mod={{ role: 'assistant', status: message.status }} {...getStyles('turn')}>
        <Box {...getStyles('answer')}>
          {message.parts.map(renderPart)}
          {streaming && message.parts.length === 0 && (
            <Loader
              type="dots"
              size="sm"
              aria-label={allLabels.thinking}
              {...getStyles('thinking')}
            />
          )}
        </Box>
        {message.status === 'error' && (
          <Alert color="red" variant="light" title={allLabels.error} {...getStyles('error')}>
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
                {allLabels.retry}
              </Button>
            )}
          </Alert>
        )}
        {!streaming && (
          <MessageActions
            actions={actions}
            text={getAssistantText(message)}
            preview={stripMarkdown(getAssistantText(message))}
            labels={{ copy: allLabels.copy, copied: allLabels.copied }}
            {...getStyles('actions')}
          />
        )}
      </Box>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <>
      <MessageList<AssistantMessage>
        ref={ref}
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
          message.role === 'user' ? renderPrompt(message) : renderAnswer(message)
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

import {
  ActionIcon,
  Box,
  BoxProps,
  CloseButton,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  SegmentedControl,
  StylesApiProps,
  Text,
  Textarea,
  TextareaProps,
  useProps,
  useStyles,
} from '@mantine/core';
import { useId, useIsomorphicEffect, useMergedRef, useUncontrolled } from '@mantine/hooks';
import React, { useEffect, useRef } from 'react';
import classes from './Composer.module.css';

export type ComposerStylesNames =
  | 'root'
  | 'modes'
  | 'reply'
  | 'replyText'
  | 'field'
  | 'input'
  | 'send';

/** The message being answered, shown above the text box */
export interface ComposerReply {
  /** `id` of the message being answered, sent as `replyToId` */
  id: string;
  authorName: string;
  body: string;
}

/** What the user sends */
export interface ComposerDraft {
  /** Trimmed text */
  text: string;
  format: 'text' | 'markdown';
  attachments: File[];

  /** Which mode was chosen, for example `'reply'` or `'note'` */
  mode?: string;

  /** `id` of the message being answered */
  replyToId?: string;
}

/** One choice of the mode switch, for example Reply or Internal note */
export interface ComposerMode {
  /** Sent as `draft.mode` */
  value: string;
  label: string;

  /** Colour of the switch while this mode is chosen */
  color?: MantineColor;

  /** Placeholder while this mode is chosen, instead of the `placeholder` prop */
  placeholder?: string;

  /** An internal note: the composer gets `data-note` and the note styling */
  note?: boolean;
}

export interface ComposerLabels {
  /** Accessible label of the send button */
  send: string;

  /** Before the author's name in the reply bar */
  replyingTo: string;

  /** Accessible label of the button that cancels the reply */
  cancelReply: string;

  /** Accessible label of the stop button shown while `streaming` */
  stop: string;

  /** Accessible label of the mode switch */
  modes: string;
}

export interface ComposerProps
  extends BoxProps, StylesApiProps<ComposerFactory>, ElementProps<'div', 'onChange'> {
  /** Text in the box, controlled */
  value?: string;

  /** Text in the box at first, uncontrolled */
  defaultValue?: string;

  /** Called when the text changes */
  onChange?: (value: string) => void;

  /** Called with the draft when the user sends it; the box then clears */
  onSend?: (draft: ComposerDraft) => void;

  /** How the text is written, copied into each draft, `'text'` by default */
  format?: 'text' | 'markdown';

  /** `'Message'` by default */
  placeholder?: string;

  /** The message being answered; shows a bar above the box and focuses it */
  replyTo?: ComposerReply | null;

  /** Called when the user cancels the reply, with the close button or Escape */
  onCancelReply?: () => void;

  /** Choices above the box, for example Reply and Internal note; the chosen one goes in the draft */
  modes?: ComposerMode[];

  /** `value` of the chosen mode, controlled */
  mode?: string;

  /** `value` of the mode chosen at first, uncontrolled; the first mode by default */
  defaultMode?: string;

  /** Called when the user picks a mode */
  onModeChange?: (mode: string) => void;

  /** Text for buttons and the reply bar, for translation */
  labels?: Partial<ComposerLabels>;

  disabled?: boolean;

  /** The text can be read and selected but not changed or sent */
  readOnly?: boolean;

  /** Ref of the text box, for example to focus it */
  inputRef?: React.Ref<HTMLTextAreaElement>;

  /** Props of the text box (`Textarea`), for example `name`, `maxLength`, `autoFocus` or `onPaste`;
   * `onChange` and `onKeyDown` run after the composer's own handlers */
  textareaProps?: TextareaProps;

  /** Most rows the box grows to before it scrolls, 6 by default */
  maxRows?: number;

  /** An answer is being generated: the send button becomes a stop button and Enter does not send */
  streaming?: boolean;

  /** Called when the user clicks the stop button */
  onStop?: () => void;
}

export type ComposerFactory = Factory<{
  props: ComposerProps;
  ref: HTMLDivElement;
  stylesNames: ComposerStylesNames;
}>;

const defaultProps: Partial<ComposerProps> = {
  placeholder: 'Message',
  maxRows: 6,
  format: 'text',
};

const defaultLabels: ComposerLabels = {
  send: 'Send',
  replyingTo: 'Replying to',
  cancelReply: 'Cancel reply',
  stop: 'Stop',
  modes: 'Message type',
};

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}

export const Composer = factory<ComposerFactory>((_props) => {
  const props = useProps('Composer', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    value,
    defaultValue,
    onChange,
    onSend,
    format,
    placeholder,
    replyTo,
    onCancelReply,
    modes,
    mode,
    defaultMode,
    onModeChange,
    labels,
    disabled,
    readOnly,
    inputRef,
    textareaProps,
    maxRows,
    streaming,
    onStop,
    mod,
    ...others
  } = props;

  const getStyles = useStyles<ComposerFactory>({
    name: 'Composer',
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

  const [text, setText] = useUncontrolled({ value, defaultValue, finalValue: '', onChange });
  const [currentMode, setMode] = useUncontrolled<string>({
    value: mode,
    defaultValue: defaultMode,
    finalValue: modes?.[0]?.value ?? '',
    onChange: onModeChange,
  });
  const activeMode = modes?.find((item) => item.value === currentMode);
  const canSend = !disabled && !readOnly && !streaming && text.trim().length > 0;
  const allLabels = { ...defaultLabels, ...labels };

  const ownInputRef = useRef<HTMLTextAreaElement>(null);
  const mergedInputRef = useMergedRef(ownInputRef, inputRef);
  useEffect(() => {
    if (replyTo) {
      ownInputRef.current!.focus();
    }
  }, [replyTo]);

  const send = () => {
    if (canSend) {
      onSend?.({
        text: text.trim(),
        format: format!,
        attachments: [],
        ...(activeMode && { mode: activeMode.value }),
        ...(replyTo && { replyToId: replyTo.id }),
      });
      setText('');
      // Clicking send disables the button, which would drop focus; keep it in the box
      ownInputRef.current!.focus();
    }
  };

  const replyId = useId();
  const describedBy =
    [replyTo && replyId, textareaProps?.['aria-describedby']].filter(Boolean).join(' ') ||
    undefined;

  // Set on the element: Mantine's input wrapper overrides an aria-describedby prop with its own ids
  useIsomorphicEffect(() => {
    if (describedBy) {
      ownInputRef.current!.setAttribute('aria-describedby', describedBy);
    } else {
      ownInputRef.current!.removeAttribute('aria-describedby');
    }
  }, [describedBy]);

  return (
    <Box
      ref={ref}
      mod={[{ mode: activeMode?.value, note: activeMode?.note }, mod]}
      {...getStyles('root')}
      {...others}
    >
      {modes && (
        <SegmentedControl
          size="xs"
          radius="xl"
          aria-label={allLabels.modes}
          data={modes.map((item) => ({ value: item.value, label: item.label }))}
          value={currentMode}
          onChange={setMode}
          color={activeMode?.color}
          disabled={disabled}
          readOnly={readOnly}
          {...getStyles('modes')}
        />
      )}
      {replyTo && (
        <Box {...getStyles('reply')}>
          <Box id={replyId} {...getStyles('replyText')}>
            <Text size="xs" c="dimmed">
              {allLabels.replyingTo}{' '}
              <Text component="span" inherit fw={600} c="var(--mantine-color-text)">
                {replyTo.authorName}
              </Text>
            </Text>
            <Text size="xs" truncate>
              {replyTo.body}
            </Text>
          </Box>
          <CloseButton size="sm" aria-label={allLabels.cancelReply} onClick={onCancelReply} />
        </Box>
      )}
      <Box {...getStyles('field')}>
        <Textarea
          {...textareaProps}
          ref={mergedInputRef}
          autosize
          minRows={1}
          maxRows={maxRows}
          variant="unstyled"
          aria-label={placeholder}
          placeholder={activeMode?.placeholder ?? placeholder}
          disabled={disabled}
          readOnly={readOnly}
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value);
            textareaProps?.onChange?.(event);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }

            if (event.key === 'Escape' && replyTo) {
              event.preventDefault();
              onCancelReply?.();
            }

            textareaProps?.onKeyDown?.(event);
          }}
          {...getStyles('input')}
        />
        <ActionIcon
          radius="xl"
          size="lg"
          aria-label={streaming ? allLabels.stop : allLabels.send}
          disabled={!streaming && !canSend}
          onClick={streaming ? onStop : send}
          mod={{ streaming }}
          {...getStyles('send')}
        >
          {streaming ? <StopIcon /> : <SendIcon />}
        </ActionIcon>
      </Box>
    </Box>
  );
});

Composer.displayName = 'Composer';
Composer.classes = classes;

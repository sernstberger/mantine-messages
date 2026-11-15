import {
  ActionIcon,
  Box,
  BoxProps,
  CloseButton,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Text,
  Textarea,
  useProps,
  useStyles,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import React, { useEffect, useRef } from 'react';
import classes from './Composer.module.css';

export type ComposerStylesNames = 'root' | 'reply' | 'replyText' | 'field' | 'input' | 'send';

/** The message being answered, shown above the text box */
export interface ComposerReply {
  authorName: string;
  body: string;
}

export interface ComposerLabels {
  /** Accessible label of the send button */
  send: string;

  /** Before the author's name in the reply bar */
  replyingTo: string;

  /** Accessible label of the button that cancels the reply */
  cancelReply: string;
}

export interface ComposerProps
  extends BoxProps, StylesApiProps<ComposerFactory>, ElementProps<'div', 'onChange'> {
  /** Text in the box, controlled */
  value?: string;

  /** Text in the box at first, uncontrolled */
  defaultValue?: string;

  /** Called when the text changes */
  onChange?: (value: string) => void;

  /** Called with the trimmed text when the user sends it; the box then clears */
  onSend?: (value: string) => void;

  /** `'Message'` by default */
  placeholder?: string;

  /** The message being answered; shows a bar above the box and focuses it */
  replyTo?: ComposerReply | null;

  /** Called when the user cancels the reply, with the close button or Escape */
  onCancelReply?: () => void;

  /** Text for buttons and the reply bar, for translation */
  labels?: Partial<ComposerLabels>;

  disabled?: boolean;

  /** Most rows the box grows to before it scrolls, 6 by default */
  maxRows?: number;
}

export type ComposerFactory = Factory<{
  props: ComposerProps;
  ref: HTMLDivElement;
  stylesNames: ComposerStylesNames;
}>;

const defaultProps: Partial<ComposerProps> = {
  placeholder: 'Message',
  maxRows: 6,
};

const defaultLabels: ComposerLabels = {
  send: 'Send',
  replyingTo: 'Replying to',
  cancelReply: 'Cancel reply',
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

export const Composer = factory<ComposerFactory>((_props) => {
  const props = useProps('Composer', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    value,
    defaultValue,
    onChange,
    onSend,
    placeholder,
    replyTo,
    onCancelReply,
    labels,
    disabled,
    maxRows,
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
  });

  const [text, setText] = useUncontrolled({ value, defaultValue, finalValue: '', onChange });
  const canSend = !disabled && text.trim().length > 0;
  const allLabels = { ...defaultLabels, ...labels };

  // Choosing a message to answer puts the cursor in the box
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (replyTo) {
      inputRef.current!.focus();
    }
  }, [replyTo]);

  const send = () => {
    if (canSend) {
      onSend?.(text.trim());
      setText('');
    }
  };

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {replyTo && (
        <Box {...getStyles('reply')}>
          <Box {...getStyles('replyText')}>
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
          ref={inputRef}
          autosize
          minRows={1}
          maxRows={maxRows}
          variant="unstyled"
          aria-label={placeholder}
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }

            if (event.key === 'Escape' && replyTo) {
              event.preventDefault();
              onCancelReply?.();
            }
          }}
          {...getStyles('input')}
        />
        <ActionIcon
          radius="xl"
          size="lg"
          aria-label={allLabels.send}
          disabled={!canSend}
          onClick={send}
          {...getStyles('send')}
        >
          <SendIcon />
        </ActionIcon>
      </Box>
    </Box>
  );
});

Composer.displayName = 'Composer';
Composer.classes = classes;

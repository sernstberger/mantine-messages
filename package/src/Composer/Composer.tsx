import {
  ActionIcon,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Textarea,
  useProps,
  useStyles,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import React from 'react';
import classes from './Composer.module.css';

export type ComposerStylesNames = 'root' | 'input' | 'send';

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

  /** Accessible label of the send button, `'Send'` by default */
  sendLabel?: string;

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
  sendLabel: 'Send',
  maxRows: 6,
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
    sendLabel,
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

  const send = () => {
    if (canSend) {
      onSend?.(text.trim());
      setText('');
    }
  };

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      <Textarea
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
        }}
        {...getStyles('input')}
      />
      <ActionIcon
        radius="xl"
        size="lg"
        aria-label={sendLabel}
        disabled={!canSend}
        onClick={send}
        {...getStyles('send')}
      >
        <SendIcon />
      </ActionIcon>
    </Box>
  );
});

Composer.displayName = 'Composer';
Composer.classes = classes;

import {
  Box,
  BoxProps,
  CloseButton,
  CloseButtonProps,
  CompoundStylesApiProps,
  createSafeContext,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  Text,
  Title,
  TitleOrder,
  useProps,
  useStyles,
} from '@mantine/core';
import { useId, useIsomorphicEffect, useMergedRef } from '@mantine/hooks';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  TeamThread,
  type TeamThreadProps,
  type TeamThreadStylesNames,
} from '../TeamThread/TeamThread';
import type { ChatMessage } from '../types';
import classes from './ThreadPanel.module.css';

export type ThreadPanelStylesNames =
  | 'root'
  | 'header'
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'close'
  | 'thread'
  | 'composer';

export interface ThreadPanelLabels {
  /** Accessible label of the close button */
  close: string;
}

interface ThreadPanelContextValue {
  getStyles: GetStylesApi<ThreadPanelFactory>;
  unstyled: boolean | undefined;

  /** Called by `ThreadPanel.Replies` when it shows a thread, to move focus to the title */
  onThreadChange: () => void;
}

const [ThreadPanelProvider, useThreadPanelContext] = createSafeContext<ThreadPanelContextValue>(
  'ThreadPanel component was not found in tree'
);

export type ThreadPanelRepliesStylesNames = TeamThreadStylesNames;

export interface ThreadPanelRepliesProps extends Omit<TeamThreadProps, 'items' | 'threadParentId'> {
  /** The message the thread belongs to */
  parent: ChatMessage;

  /** Replies, oldest first */
  replies: ChatMessage[];
}

export type ThreadPanelRepliesFactory = Factory<{
  props: ThreadPanelRepliesProps;
  ref: HTMLDivElement;
  stylesNames: ThreadPanelRepliesStylesNames;
}>;

/**
 * The thread: a `TeamThread` of the parent, a replies divider and the replies. Takes every
 * `TeamThread` prop but `items` and `threadParentId`; its Styles API is `TeamThread`'s, and the
 * panel's `thread` selector styles its root. Showing another `parent` moves focus to the title as
 * opening the panel does
 */
export const ThreadPanelReplies = factory<ThreadPanelRepliesFactory>((_props) => {
  const { parent, replies, className, style, unstyled, ...others } = useProps(
    'ThreadPanelReplies',
    null,
    _props
  );
  const ctx = useThreadPanelContext();
  const { onThreadChange } = ctx;
  const {
    className: threadClassName,
    style: threadStyle,
    ...threadAttributes
  } = ctx.getStyles('thread');

  useEffect(() => {
    onThreadChange();
  }, [parent.id, onThreadChange]);

  return (
    <TeamThread
      items={[parent, ...replies]}
      threadParentId={parent.id}
      className={className ? `${threadClassName} ${className}` : threadClassName}
      style={[threadStyle, style]}
      unstyled={unstyled ?? ctx.unstyled}
      {...threadAttributes}
      {...others}
    />
  );
});

ThreadPanelReplies.displayName = 'ThreadPanelReplies';
ThreadPanelReplies.classes = classes;

export type ThreadPanelFooterStylesNames = 'composer';

export interface ThreadPanelFooterProps
  extends BoxProps, CompoundStylesApiProps<ThreadPanelFooterFactory>, ElementProps<'div'> {}

export type ThreadPanelFooterFactory = Factory<{
  props: ThreadPanelFooterProps;
  ref: HTMLDivElement;
  stylesNames: ThreadPanelFooterStylesNames;
  compound: true;
}>;

/** Under the replies, padded: the place for a `Composer` */
export const ThreadPanelFooter = factory<ThreadPanelFooterFactory>((_props) => {
  const { classNames, className, style, styles, vars, ...others } = useProps(
    'ThreadPanelFooter',
    null,
    _props
  );
  const ctx = useThreadPanelContext();

  return (
    <Box {...ctx.getStyles('composer', { className, style, classNames, styles })} {...others} />
  );
});

ThreadPanelFooter.displayName = 'ThreadPanelFooter';
ThreadPanelFooter.classes = classes;

export interface ThreadPanelProps
  extends BoxProps, StylesApiProps<ThreadPanelFactory>, ElementProps<'div', 'title'> {
  /** Heading of the panel, also its accessible name @default 'Thread' */
  title?: React.ReactNode;

  /** Under the title, for example the channel name */
  subtitle?: React.ReactNode;

  /** Heading level of the title @default 2 */
  titleOrder?: TitleOrder;

  /** Called when the user closes the panel with its close button */
  onClose?: () => void;

  /** Shows the close button; `true` by default when `onClose` is set */
  withCloseButton?: boolean;

  /** Props passed down to the close button */
  closeButtonProps?: CloseButtonProps & ElementProps<'button'>;

  /**
   * Moves focus to the title when the panel opens (or shows another thread) from a focused
   * control, and back to that control when the panel closes with focus inside it @default true
   */
  withFocusManagement?: boolean;

  /** Text, for translation */
  labels?: Partial<ThreadPanelLabels>;

  /** Content under the header, usually `ThreadPanel.Replies` and `ThreadPanel.Footer` */
  children?: React.ReactNode;
}

export type ThreadPanelFactory = Factory<{
  props: ThreadPanelProps;
  ref: HTMLDivElement;
  stylesNames: ThreadPanelStylesNames;
  staticComponents: {
    Replies: typeof ThreadPanelReplies;
    Footer: typeof ThreadPanelFooter;
  };
}>;

const defaultProps = {
  title: 'Thread',
  titleOrder: 2,
  withFocusManagement: true,
} satisfies Partial<ThreadPanelProps>;

const defaultLabels: ThreadPanelLabels = { close: 'Close thread' };

/**
 * A thread beside the channel: a header with the title, subtitle and close button over
 * `ThreadPanel.Replies` and `ThreadPanel.Footer`. A complementary region named by its title
 */
export const ThreadPanel = factory<ThreadPanelFactory>((_props) => {
  const props = useProps('ThreadPanel', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    title,
    subtitle,
    titleOrder,
    onClose,
    withCloseButton,
    closeButtonProps,
    withFocusManagement,
    labels,
    children,
    ...others
  } = props;

  const getStyles = useStyles<ThreadPanelFactory>({
    name: 'ThreadPanel',
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

  const { close: closeLabel } = { ...defaultLabels, ...labels };
  const titleId = `${useId()}-title`;

  // Escape does not close the panel: it is not a dialog, and its composer owns Escape
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, rootRef);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const manageFocus = useRef(withFocusManagement);
  manageFocus.current = withFocusManagement;

  const focusTitle = useCallback(() => {
    const active = document.activeElement as HTMLElement;

    // Nothing focused (open at page load): focusing the title would scroll the page to it
    if (!manageFocus.current || active === document.body || rootRef.current!.contains(active)) {
      return;
    }

    opener.current = active;
    titleRef.current!.focus();
  }, []);

  useEffect(focusTitle, [withFocusManagement, focusTitle]);

  // Layout effect: its cleanup runs while the panel is still in the document
  useIsomorphicEffect(() => {
    const root = rootRef.current!;

    return () => {
      const target = opener.current;

      if (manageFocus.current && target?.isConnected && root.contains(document.activeElement)) {
        target.focus();
      }
    };
  }, []);

  return (
    <ThreadPanelProvider value={{ getStyles, unstyled, onThreadChange: focusTitle }}>
      <Box
        ref={mergedRef}
        role="complementary"
        aria-labelledby={titleId}
        {...getStyles('root')}
        {...others}
      >
        <Box {...getStyles('header')}>
          <Box {...getStyles('heading')}>
            <Title
              ref={titleRef}
              id={titleId}
              order={titleOrder}
              size="md"
              lh="md"
              tabIndex={-1}
              unstyled={unstyled}
              {...getStyles('title')}
            >
              {title}
            </Title>
            {subtitle && (
              <Text size="xs" c="dimmed" truncate unstyled={unstyled} {...getStyles('subtitle')}>
                {subtitle}
              </Text>
            )}
          </Box>
          {(withCloseButton ?? !!onClose) && (
            <CloseButton
              aria-label={closeLabel}
              unstyled={unstyled}
              {...closeButtonProps}
              onClick={(event) => {
                closeButtonProps?.onClick?.(event);
                onClose?.();
              }}
              {...getStyles('close', {
                className: closeButtonProps?.className,
                style: closeButtonProps?.style,
              })}
            />
          )}
        </Box>
        {children}
      </Box>
    </ThreadPanelProvider>
  );
});

ThreadPanel.displayName = 'ThreadPanel';
ThreadPanel.classes = classes;
ThreadPanel.Replies = ThreadPanelReplies;
ThreadPanel.Footer = ThreadPanelFooter;

export namespace ThreadPanel {
  export type Props = ThreadPanelProps;
  export type StylesNames = ThreadPanelStylesNames;
  export type Factory = ThreadPanelFactory;
  export type Labels = ThreadPanelLabels;

  export namespace Replies {
    export type Props = ThreadPanelRepliesProps;
    export type StylesNames = ThreadPanelRepliesStylesNames;
    export type Factory = ThreadPanelRepliesFactory;
  }

  export namespace Footer {
    export type Props = ThreadPanelFooterProps;
    export type StylesNames = ThreadPanelFooterStylesNames;
    export type Factory = ThreadPanelFooterFactory;
  }
}

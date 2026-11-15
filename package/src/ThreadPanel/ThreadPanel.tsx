import {
  Box,
  BoxProps,
  CloseButton,
  CloseButtonProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Text,
  Title,
  TitleOrder,
  useProps,
  useStyles,
} from '@mantine/core';
import { useIsomorphicEffect, useMergedRef } from '@mantine/hooks';
import React, { useEffect, useRef } from 'react';
import type { MessageListControl } from '../MessageList/MessageList';
import type { MessageAction } from '../MessageActions/MessageActions';
import { TeamThread, type TeamThreadLabels } from '../TeamThread/TeamThread';
import type { ChatMessage, MessageAttachment, MessagesUser } from '../types';
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

export interface ThreadPanelLabels extends TeamThreadLabels {
  /** Heading of the panel, also its accessible name */
  title: string;

  /** Accessible label of the close button */
  close: string;
}

export interface ThreadPanelProps
  extends BoxProps, StylesApiProps<ThreadPanelFactory>, ElementProps<'div'> {
  /** The message the thread belongs to */
  parent: ChatMessage;

  /** Replies, oldest first */
  replies: ChatMessage[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking */
  currentUserId: string;

  /** Heading level of the title, `2` by default */
  titleOrder?: TitleOrder;

  /** Under the title, for example the channel name */
  subtitle?: React.ReactNode;

  /** Called when the user closes the panel with its close button */
  onClose?: () => void;

  /** Shows the close button; `true` by default when `onClose` is set */
  withCloseButton?: boolean;

  /** Props of the close button */
  closeButtonProps?: CloseButtonProps & ElementProps<'button'>;

  /**
   * Moves focus to the title when the panel opens (or shows another thread) from a focused
   * control, and back to that control when the panel closes with focus inside it, `true` by
   * default
   */
  withFocusManagement?: boolean;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Actions on hover, as in `TeamThread` */
  actions?: MessageAction[];
  onReact?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the last read reply; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Longest gap, in milliseconds, between two replies of one group, 5 minutes by default */
  groupWindow?: number;

  /** Keep the newest reply in view, `true` by default */
  autoScroll?: boolean;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More replies exist before the first one */
  hasOlder?: boolean;

  /** Older replies are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Gets `{ jumpTo }` of the thread's list, to scroll to a reply and flash it */
  controlRef?: React.Ref<MessageListControl>;

  /** Text, for translation */
  labels?: Partial<ThreadPanelLabels>;

  /** Shown under the replies, usually a `Composer` */
  children?: React.ReactNode;
}

export type ThreadPanelFactory = Factory<{
  props: ThreadPanelProps;
  ref: HTMLDivElement;
  stylesNames: ThreadPanelStylesNames;
}>;

const defaultProps = {
  titleOrder: 2,
  withFocusManagement: true,
} satisfies Partial<ThreadPanelProps>;

const defaultLabels = { title: 'Thread', close: 'Close thread' };

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
    parent,
    replies,
    users,
    currentUserId,
    titleOrder,
    subtitle,
    onClose,
    withCloseButton,
    closeButtonProps,
    withFocusManagement,
    locale,
    actions,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    unreadAfterId,
    groupWindow,
    autoScroll,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    controlRef,
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

  const { title: titleLabel, close: closeLabel, ...threadLabels } = { ...defaultLabels, ...labels };

  // Escape does not close the panel: it is not a dialog, and its composer owns Escape
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, rootRef);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const manageFocus = useRef(withFocusManagement);
  manageFocus.current = withFocusManagement;

  useEffect(() => {
    const active = document.activeElement as HTMLElement;

    // Nothing focused (open at page load): focusing the title would scroll the page to it
    if (!withFocusManagement || active === document.body) {
      return;
    }

    if (!rootRef.current!.contains(active)) {
      opener.current = active;
      titleRef.current!.focus();
    }
  }, [parent.id, withFocusManagement]);

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
    <Box
      ref={mergedRef}
      role="complementary"
      aria-label={titleLabel}
      {...getStyles('root')}
      {...others}
    >
      <Box {...getStyles('header')}>
        <Box {...getStyles('heading')}>
          <Title
            ref={titleRef}
            order={titleOrder}
            size="md"
            lh="md"
            tabIndex={-1}
            {...getStyles('title')}
          >
            {titleLabel}
          </Title>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate {...getStyles('subtitle')}>
              {subtitle}
            </Text>
          )}
        </Box>
        {(withCloseButton ?? !!onClose) && (
          <CloseButton
            aria-label={closeLabel}
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
      <TeamThread
        items={[parent, ...replies]}
        threadParentId={parent.id}
        users={users}
        currentUserId={currentUserId}
        locale={locale}
        actions={actions}
        onReact={onReact}
        onEdit={onEdit}
        onToggleReaction={onToggleReaction}
        onOpenAttachment={onOpenAttachment}
        unreadAfterId={unreadAfterId}
        groupWindow={groupWindow}
        autoScroll={autoScroll}
        onLoadOlder={onLoadOlder}
        hasOlder={hasOlder}
        loadingOlder={loadingOlder}
        controlRef={controlRef}
        labels={threadLabels}
        unstyled={unstyled}
        {...getStyles('thread')}
      />
      {children && <Box {...getStyles('composer')}>{children}</Box>}
    </Box>
  );
});

ThreadPanel.displayName = 'ThreadPanel';
ThreadPanel.classes = classes;

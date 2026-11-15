import {
  Box,
  BoxProps,
  CloseButton,
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
import React from 'react';
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

  /** Called when the user closes the panel; shows a close button */
  onClose?: () => void;

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

const defaultProps: Partial<ThreadPanelProps> = { titleOrder: 2 };

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
    ref,
    parent,
    replies,
    users,
    currentUserId,
    titleOrder,
    subtitle,
    onClose,
    locale,
    actions,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    unreadAfterId,
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
  });

  const { title: titleLabel, close: closeLabel, ...threadLabels } = { ...defaultLabels, ...labels };

  return (
    <Box ref={ref} role="complementary" aria-label={titleLabel} {...getStyles('root')} {...others}>
      <Box {...getStyles('header')}>
        <Box {...getStyles('heading')}>
          <Title order={titleOrder} size="md" lh="md" {...getStyles('title')}>
            {titleLabel}
          </Title>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate {...getStyles('subtitle')}>
              {subtitle}
            </Text>
          )}
        </Box>
        {onClose && (
          <CloseButton aria-label={closeLabel} onClick={onClose} {...getStyles('close')} />
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

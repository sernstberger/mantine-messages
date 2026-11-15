import {
  Avatar,
  Box,
  BoxProps,
  Divider,
  ElementProps,
  factory,
  Factory,
  ScrollArea,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React, { useMemo, useRef } from 'react';
import type { Message, MessageStatus, MessagesUser } from '../types';
import { formatDay, formatTime } from '../utils/format';
import { groupMessages } from '../utils/group-messages';
import classes from './Thread.module.css';
import { useStickToBottom } from './use-stick-to-bottom';

export type ThreadStylesNames =
  | 'root'
  | 'list'
  | 'divider'
  | 'group'
  | 'avatar'
  | 'messages'
  | 'author'
  | 'bubble'
  | 'meta'
  | 'status';

export interface ThreadLabels {
  status: Record<MessageStatus, string>;
}

export interface ThreadProps extends BoxProps, StylesApiProps<ThreadFactory>, ElementProps<'div'> {
  /** Messages, oldest first */
  messages: Message[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking at the thread; their messages sit on the right */
  currentUserId: string;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Longest gap, in milliseconds, between two messages of one group, 5 minutes by default */
  groupWindow?: number;

  /** Show avatars and names of other people, `true` by default */
  withAuthors?: boolean;

  /**
   * Keep the newest message in view: open at the bottom, follow new messages while the user is at
   * the bottom or when they sent them, `true` by default
   */
  autoScroll?: boolean;

  /** Text for statuses, for translation */
  labels?: Partial<ThreadLabels['status']>;
}

export type ThreadFactory = Factory<{
  props: ThreadProps;
  ref: HTMLDivElement;
  stylesNames: ThreadStylesNames;
}>;

const defaultLabels: ThreadLabels['status'] = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
};

const defaultProps: Partial<ThreadProps> = {
  groupWindow: 5 * 60 * 1000,
  withAuthors: true,
  autoScroll: true,
};

export const Thread = factory<ThreadFactory>((_props) => {
  const props = useProps('Thread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    messages,
    users,
    currentUserId,
    locale,
    groupWindow,
    withAuthors,
    labels,
    autoScroll,
    role = 'log',
    'aria-live': ariaLive = 'polite',
    ...others
  } = props;

  const getStyles = useStyles<ThreadFactory>({
    name: 'Thread',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const items = useMemo(() => groupMessages(messages, groupWindow), [messages, groupWindow]);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const statusLabels = { ...defaultLabels, ...labels };
  const lastOwn = [...messages].reverse().find((message) => message.authorId === currentUserId);
  const last = messages[messages.length - 1];

  const viewportRef = useRef<HTMLDivElement>(null);
  const onScrollPositionChange = useStickToBottom(viewportRef, {
    enabled: !!autoScroll,
    firstId: messages[0]?.id,
    lastId: last?.id,
    lastIsOwn: last?.authorId === currentUserId,
  });

  return (
    <ScrollArea
      ref={ref}
      viewportRef={viewportRef}
      onScrollPositionChange={onScrollPositionChange}
      {...getStyles('root')}
      {...others}
    >
      <Box role={role} aria-live={ariaLive} {...getStyles('list')}>
        {items.map((item) => {
          if (item.type === 'divider') {
            return (
              <Divider
                key={item.key}
                label={formatDay(item.date, locale)}
                labelPosition="center"
                {...getStyles('divider')}
              />
            );
          }

          const own = item.authorId === currentUserId;
          const author = usersById.get(item.authorId);
          const name = author?.name ?? item.authorId;

          return (
            <Box key={item.key} mod={{ own }} {...getStyles('group')}>
              {!own && withAuthors && (
                <Avatar src={author?.avatar} name={name} size="sm" {...getStyles('avatar')} />
              )}
              <Box {...getStyles('messages')}>
                {!own && withAuthors && <Box {...getStyles('author')}>{name}</Box>}
                {item.messages.map((message) => (
                  <Box
                    key={message.id}
                    mod={{ own, status: message.status }}
                    title={formatTime(message.createdAt, locale)}
                    {...getStyles('bubble')}
                  >
                    {message.body}
                  </Box>
                ))}
                <Box {...getStyles('meta')}>
                  {formatTime(item.messages[item.messages.length - 1].createdAt, locale)}
                  {own && lastOwn?.status && item.messages.includes(lastOwn) && (
                    <Box component="span" mod={{ status: lastOwn.status }} {...getStyles('status')}>
                      {' · '}
                      {statusLabels[lastOwn.status]}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </ScrollArea>
  );
});

Thread.displayName = 'Thread';
Thread.classes = classes;

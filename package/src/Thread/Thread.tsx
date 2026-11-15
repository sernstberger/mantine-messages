import {
  ActionIcon,
  Avatar,
  Box,
  BoxProps,
  Divider,
  ElementProps,
  factory,
  Factory,
  ScrollArea,
  StylesApiProps,
  Text,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import { useReducedMotion, useTimeout } from '@mantine/hooks';
import React, { useMemo, useRef, useState } from 'react';
import type { ChatMessage, MessageStatus, MessagesUser } from '../types';
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
  | 'row'
  | 'content'
  | 'bubble'
  | 'quoteLabel'
  | 'quote'
  | 'replyButton'
  | 'meta'
  | 'status';

export interface ThreadLabels extends Record<MessageStatus, string> {
  /** Accessible label of the reply button */
  reply: string;

  /** Quote of a message that is not in `messages`, for example not loaded yet */
  unavailable: string;

  /** Caption above a quoted message; `own` and `toOwn` say which side is the current user */
  repliedTo: (names: { author: string; original: string; own: boolean; toOwn: boolean }) => string;
}

export interface ThreadProps extends BoxProps, StylesApiProps<ThreadFactory>, ElementProps<'div'> {
  /** Messages, oldest first */
  messages: ChatMessage[];

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

  /** Called when the user asks to reply to a message; shows a reply button beside each one */
  onReply?: (message: ChatMessage) => void;

  /** Text for statuses and buttons, for translation */
  labels?: Partial<ThreadLabels>;
}

export type ThreadFactory = Factory<{
  props: ThreadProps;
  ref: HTMLDivElement;
  stylesNames: ThreadStylesNames;
}>;

const defaultLabels: ThreadLabels = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
  reply: 'Reply',
  unavailable: 'Original message not available',
  repliedTo: ({ author, original, own, toOwn }) =>
    `${own ? 'You' : author} replied to ${toOwn ? (own ? 'yourself' : 'you') : original}`,
};

function ReplyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
    onReply,
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
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages]
  );
  const allLabels = { ...defaultLabels, ...labels };
  const lastOwn = [...messages].reverse().find((message) => message.authorId === currentUserId);
  const last = messages[messages.length - 1];

  const viewportRef = useRef<HTMLDivElement>(null);
  const onScrollPositionChange = useStickToBottom(viewportRef, {
    enabled: !!autoScroll,
    firstId: messages[0]?.id,
    lastId: last?.id,
    lastIsOwn: last?.authorId === currentUserId,
  });

  // A click on a quote scrolls to the original message and flashes it
  const reduceMotion = useReducedMotion();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const flash = useTimeout(() => setHighlighted(null), 1600);
  const jumpTo = (id: string) => {
    Array.from(viewportRef.current!.querySelectorAll<HTMLElement>('[data-message-id]'))
      .find((element) => element.dataset.messageId === id)
      ?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    flash.clear();
    setHighlighted(id);
    flash.start();
  };

  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;

  // The answered message: a caption, then a faded copy tucked under the reply's bubble
  const renderQuote = (message: ChatMessage) => {
    const original = messagesById.get(message.replyToId!);

    if (!original) {
      return (
        <Box mod={{ unavailable: true }} {...getStyles('quote')}>
          <Text size="xs" lineClamp={2}>
            {allLabels.unavailable}
          </Text>
        </Box>
      );
    }

    return (
      <>
        <Text size="xs" c="dimmed" {...getStyles('quoteLabel')}>
          <ReplyIcon size={12} />
          {allLabels.repliedTo({
            author: nameOf(message.authorId),
            original: nameOf(original.authorId),
            own: message.authorId === currentUserId,
            toOwn: original.authorId === currentUserId,
          })}
        </Text>
        <UnstyledButton onClick={() => jumpTo(original.id)} {...getStyles('quote')}>
          <Text size="xs" lineClamp={2}>
            {original.body}
          </Text>
        </UnstyledButton>
      </>
    );
  };

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
          const name = nameOf(item.authorId);

          return (
            <Box key={item.key} mod={{ own }} {...getStyles('group')}>
              {!own && withAuthors && (
                <Avatar src={author?.avatar} name={name} size="sm" {...getStyles('avatar')} />
              )}
              <Box {...getStyles('messages')}>
                {!own && withAuthors && (
                  <Text size="xs" c="dimmed" {...getStyles('author')}>
                    {name}
                  </Text>
                )}
                {item.messages.map((message) => (
                  <Box key={message.id} mod={{ own }} {...getStyles('row')}>
                    <Box mod={{ own }} {...getStyles('content')}>
                      {message.replyToId && renderQuote(message)}
                      <Box
                        mod={{
                          own,
                          status: message.status,
                          'message-id': message.id,
                          highlighted: highlighted === message.id,
                        }}
                        title={formatTime(message.createdAt, locale)}
                        {...getStyles('bubble')}
                      >
                        {message.body}
                      </Box>
                    </Box>
                    {onReply && (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        radius="xl"
                        aria-label={`${allLabels.reply}: ${message.body}`}
                        onClick={() => onReply(message)}
                        {...getStyles('replyButton')}
                      >
                        <ReplyIcon />
                      </ActionIcon>
                    )}
                  </Box>
                ))}
                <Text component="div" size="xs" c="dimmed" {...getStyles('meta')}>
                  {formatTime(item.messages[item.messages.length - 1].createdAt, locale)}
                  {own && lastOwn?.status && item.messages.includes(lastOwn) && (
                    <Box component="span" mod={{ status: lastOwn.status }} {...getStyles('status')}>
                      {' · '}
                      {allLabels[lastOwn.status]}
                    </Box>
                  )}
                </Text>
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

import {
  Avatar,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  Text,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React, { useMemo } from 'react';
import { Attachments } from '../Attachments/Attachments';
import { ReplyIcon } from '../icons';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList, type MessageListControl } from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type { ChatMessage, MessageAttachment, MessageStatus, MessagesUser } from '../types';
import { toDate } from '../utils/dates';
import { formatTime } from '../utils/format';
import { getPreview } from '../utils/preview';
import classes from './ChatThread.module.css';

export type ChatThreadStylesNames =
  | 'root'
  | 'list'
  | 'divider'
  | 'unread'
  | 'loader'
  | 'item'
  | 'row'
  | 'avatar'
  | 'avatarSpace'
  | 'content'
  | 'author'
  | 'quoteLabel'
  | 'quote'
  | 'line'
  | 'bubble'
  | 'actions'
  | 'reactions'
  | 'attachments'
  | 'meta'
  | 'status';

export interface ChatThreadLabels extends Record<MessageStatus, string> {
  /** Accessible label of the reply button */
  reply: string;

  /** Quote of a message that is not in `messages`, for example not loaded yet */
  unavailable: string;

  /** Caption above a quoted message; `own` and `toOwn` say which side is the current user */
  repliedTo: (names: { author: string; original: string; own: boolean; toOwn: boolean }) => string;

  /** Line above the first unread message */
  newMessages: string;
}

export interface ChatThreadProps
  extends BoxProps, StylesApiProps<ChatThreadFactory>, ElementProps<'div'> {
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
   * Renders the body of a message, for example markdown with `MarkdownBody` from
   * `mantine-messages/markdown`; the plain `body` by default
   */
  renderBody?: (message: ChatMessage) => React.ReactNode;

  /**
   * Keep the newest message in view: open at the bottom, follow new messages while the user is at
   * the bottom or when they sent them, `true` by default
   */
  autoScroll?: boolean;

  /** Actions beside each message; a built-in shows only when its handler is set, `['reply', 'react', 'edit']` by default */
  actions?: MessageAction[];

  /** Called when the user asks to reply to a message */
  onReply?: (message: ChatMessage) => void;

  /** Called when the user asks to react to a message, for example to open an emoji picker */
  onReact?: (message: ChatMessage) => void;

  /** Called when the user asks to edit a message */
  onEdit?: (message: ChatMessage) => void;

  /** Called when the user clicks a reaction; makes reactions toggle buttons */
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;

  /** Called when the user opens an attachment; without it attachments are links */
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the last read message; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More messages exist before the first one */
  hasOlder?: boolean;

  /** Older messages are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text for statuses and buttons, for translation */
  labels?: Partial<ChatThreadLabels>;

  /** Gets `{ jumpTo }` of the inner `MessageList`, to scroll to a message and flash it */
  controlRef?: React.Ref<MessageListControl>;
}

export type ChatThreadFactory = Factory<{
  props: ChatThreadProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadStylesNames;
}>;

const defaultLabels: ChatThreadLabels = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent',
  reply: 'Reply',
  unavailable: 'Original message not available',
  repliedTo: ({ author, original, own, toOwn }) =>
    `${own ? 'You' : author} replied to ${toOwn ? (own ? 'yourself' : 'you') : original}`,
  newMessages: 'New messages',
};

const defaultProps: Partial<ChatThreadProps> = {
  groupWindow: 5 * 60 * 1000,
  withAuthors: true,
  autoScroll: true,
  actions: ['reply', 'react', 'edit'],
};

// Parts of the inner MessageList that ChatThread's Styles API also styles
const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

export const ChatThread = factory<ChatThreadFactory>((_props) => {
  const props = useProps('ChatThread', defaultProps, _props);
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
    users,
    currentUserId,
    locale,
    groupWindow,
    withAuthors,
    renderBody,
    autoScroll,
    actions,
    onReply,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    unreadAfterId,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    controlRef,
    ...others
  } = props;

  const getStyles = useStyles<ChatThreadFactory>({
    name: 'ChatThread',
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

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages]
  );
  const allLabels = { ...defaultLabels, ...labels };
  const lastOwn = [...messages].reverse().find((message) => message.authorId === currentUserId);
  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;

  const sameGroup = (previous: ChatMessage, message: ChatMessage) =>
    previous.authorId === message.authorId &&
    toDate(message.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow!;

  // The answered message: a caption, then a faded copy tucked under the reply's bubble
  const renderQuote = (message: ChatMessage, jumpTo: (id: string) => void) => {
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
            {getPreview(original)}
          </Text>
        </UnstyledButton>
      </>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <MessageList<ChatMessage>
      ref={ref}
      controlRef={controlRef}
      items={messages}
      groupWith={sameGroup}
      isOwn={(message) => message.authorId === currentUserId}
      locale={locale}
      autoScroll={autoScroll}
      unreadAfterId={unreadAfterId}
      onLoadOlder={onLoadOlder}
      hasOlder={hasOlder}
      loadingOlder={loadingOlder}
      labels={{ unread: allLabels.newMessages }}
      unstyled={unstyled}
      classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
      styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
      {...getStyles('root')}
      {...others}
      renderItem={(message, { groupStart, groupEnd, highlighted, jumpTo }) => {
        const own = message.authorId === currentUserId;
        const author = usersById.get(message.authorId);
        const name = nameOf(message.authorId);
        const showAuthor = !own && withAuthors;

        return (
          <Box mod={{ own, 'group-start': groupStart }} {...getStyles('row')}>
            {showAuthor &&
              (groupEnd ? (
                <Avatar src={author?.avatar} name={name} size="sm" {...getStyles('avatar')} />
              ) : (
                <Box {...getStyles('avatarSpace')} />
              ))}
            <Box mod={{ own }} {...getStyles('content')}>
              {showAuthor && groupStart && (
                <Text size="xs" c="dimmed" {...getStyles('author')}>
                  {name}
                </Text>
              )}
              {message.replyToId && renderQuote(message, jumpTo)}
              <Box mod={{ own }} {...getStyles('line')}>
                <Box
                  mod={{ own, status: message.status, 'message-id': message.id, highlighted }}
                  title={formatTime(message.createdAt, locale)}
                  {...getStyles('bubble')}
                >
                  {renderBody ? renderBody(message) : message.body}
                </Box>
                <MessageActions
                  actions={actions!}
                  text={getPreview(message)}
                  labels={{ reply: allLabels.reply }}
                  onReply={onReply && (() => onReply(message))}
                  onReact={onReact && (() => onReact(message))}
                  onEdit={onEdit && (() => onEdit(message))}
                  {...getStyles('actions')}
                />
              </Box>
              {message.attachments && (
                <Attachments
                  attachments={message.attachments}
                  locale={locale}
                  onOpen={
                    onOpenAttachment && ((attachment) => onOpenAttachment(message, attachment))
                  }
                  {...getStyles('attachments')}
                />
              )}
              {message.reactions && (
                <Reactions
                  reactions={message.reactions}
                  currentUserId={currentUserId}
                  onToggle={onToggleReaction && ((emoji) => onToggleReaction(message, emoji))}
                  {...getStyles('reactions')}
                />
              )}
              {groupEnd && (
                <Text component="div" size="xs" c="dimmed" {...getStyles('meta')}>
                  {formatTime(message.createdAt, locale)}
                  {own && message.id === lastOwn?.id && message.status && (
                    <Box component="span" mod={{ status: message.status }} {...getStyles('status')}>
                      {' · '}
                      {allLabels[message.status]}
                    </Box>
                  )}
                </Text>
              )}
            </Box>
          </Box>
        );
      }}
    />
  );
});

ChatThread.displayName = 'ChatThread';
ChatThread.classes = classes;

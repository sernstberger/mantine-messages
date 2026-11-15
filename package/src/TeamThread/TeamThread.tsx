import {
  Avatar,
  Box,
  BoxProps,
  Divider,
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
import { LockIcon } from '../icons';
import { Message } from '../Message/Message';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import { MessageList, type MessageListControl } from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type {
  ChatMessage,
  MessageAttachment,
  MessagesUser,
  MessageThreadSummary,
  SystemEvent,
} from '../types';
import { toDate } from '../utils/dates';
import { formatRelative, formatTime } from '../utils/format';
import { getCachedPreview } from '../utils/preview';
import classes from './TeamThread.module.css';

/** What a team channel shows: messages and events such as "Maya joined" */
export type TeamThreadItem = ChatMessage | SystemEvent;

export type TeamThreadStylesNames =
  | 'root'
  | 'list'
  | 'divider'
  | 'unread'
  | 'loader'
  | 'item'
  | 'row'
  | 'avatar'
  | 'gutterTime'
  | 'body'
  | 'meta'
  | 'author'
  | 'time'
  | 'noteLabel'
  | 'text'
  | 'edited'
  | 'actions'
  | 'attachments'
  | 'reactions'
  | 'threadSummary'
  | 'repliesDivider'
  | 'event';

export interface TeamThreadLabels {
  /** Reply count in a thread summary and in the divider of a thread */
  replies: (count: number) => string;

  /** After the reply count, for example "Last reply 2 hours ago" */
  lastReply: (time: string) => string;

  /** After the text of an edited message */
  edited: string;

  /** Above the text of an internal note */
  internal: string;

  /** Line above the first unread message */
  newMessages: string;

  /** Accessible name of the message log, unless `aria-label` is set */
  log: string;

  /** Accessible label of the loader shown while older messages load */
  loadingOlder: string;
}

export interface TeamThreadProps
  extends BoxProps, StylesApiProps<TeamThreadFactory>, ElementProps<'div'> {
  /** Messages and events, oldest first; pass channel messages only, not thread replies */
  items: TeamThreadItem[];

  /** Everyone who wrote a message, used for names and avatars */
  users: MessagesUser[];

  /** `id` of the person looking; the list follows their new messages and only they can edit theirs */
  currentUserId: string;

  /** Locale for times and date dividers, the browser's by default */
  locale?: string;

  /** Longest gap, in milliseconds, between two messages of one group, 5 minutes by default */
  groupWindow?: number;

  /** Keep the newest message in view, `true` by default */
  autoScroll?: boolean;

  /** Actions on hover; a built-in shows only when its handler is set, `['react', 'thread', 'edit', 'copy']` by default */
  actions?: MessageAction[];

  /** Called with a message whose thread the user opens, from its summary or the thread action */
  onOpenThread?: (message: ChatMessage) => void;

  /** Called when the user asks to react to a message, for example to open an emoji picker */
  onReact?: (message: ChatMessage) => void;

  /** Called when the user asks to edit one of their own messages */
  onEdit?: (message: ChatMessage) => void;

  /** Called when the user clicks a reaction; makes reactions toggle buttons */
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;

  /** Called when the user opens an attachment; without it attachments are links */
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;

  /** `id` of the message whose thread is open; marked with `data-selected` */
  selectedId?: string | null;

  /**
   * Shows the list as one thread: the item with this `id` is the parent, a divider with the reply
   * count follows it, and there are no thread summaries or thread actions
   */
  threadParentId?: string;

  /** `id` of the last read item; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More items exist before the first one */
  hasOlder?: boolean;

  /** Older items are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text, for translation */
  labels?: Partial<TeamThreadLabels>;

  /** Gets `{ jumpTo }` of the inner `MessageList`, to scroll to a message and flash it */
  controlRef?: React.Ref<MessageListControl>;
}

export type TeamThreadFactory = Factory<{
  props: TeamThreadProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadStylesNames;
}>;

const defaultLabels: TeamThreadLabels = {
  replies: (count) => (count === 1 ? '1 reply' : `${count} replies`),
  lastReply: (time) => `Last reply ${time}`,
  edited: '(edited)',
  internal: 'Internal note',
  newMessages: 'New messages',
  log: 'Messages',
  loadingOlder: 'Loading older messages',
};

const defaultProps: Partial<TeamThreadProps> = {
  groupWindow: 5 * 60 * 1000,
  autoScroll: true,
  actions: ['react', 'thread', 'edit', 'copy'],
};

// Parts of the inner MessageList that TeamThread's Styles API also styles
const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

const isEvent = (item: TeamThreadItem): item is SystemEvent => 'kind' in item;
const isInternal = (message: ChatMessage) => message.visibility === 'internal';

export const TeamThread = factory<TeamThreadFactory>((_props) => {
  const props = useProps('TeamThread', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    items,
    users,
    currentUserId,
    locale,
    groupWindow,
    autoScroll,
    actions,
    onOpenThread,
    onReact,
    onEdit,
    onToggleReaction,
    onOpenAttachment,
    selectedId,
    threadParentId,
    unreadAfterId,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    controlRef,
    ...others
  } = props;

  const getStyles = useStyles<TeamThreadFactory>({
    name: 'TeamThread',
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
  const allLabels = { ...defaultLabels, ...labels };
  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;
  const replyCount = items.filter((item) => !isEvent(item) && item.id !== threadParentId).length;

  // Same author, same visibility, close in time; events and the parent of a thread stand alone
  const sameGroup = (previous: TeamThreadItem, item: TeamThreadItem) =>
    !isEvent(previous) &&
    !isEvent(item) &&
    previous.id !== threadParentId &&
    previous.authorId === item.authorId &&
    isInternal(previous) === isInternal(item) &&
    toDate(item.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow!;

  // "12 replies  Last reply 2 hours ago" with the first three people who answered
  const renderThreadSummary = (message: ChatMessage, thread: MessageThreadSummary) => {
    const content = (
      <>
        <Avatar.Group spacing={6} aria-hidden>
          {thread.participantIds.slice(0, 3).map((id) => (
            <Avatar
              key={id}
              size={20}
              radius="sm"
              src={usersById.get(id)?.avatar}
              name={nameOf(id)}
            />
          ))}
        </Avatar.Group>
        <Text component="span" size="xs" fw={700} c="var(--mantine-color-anchor)">
          {allLabels.replies(thread.count)}
        </Text>
        <Text component="span" size="xs" c="dimmed">
          {allLabels.lastReply(formatRelative(thread.lastReplyAt, locale))}
        </Text>
      </>
    );

    return onOpenThread ? (
      <UnstyledButton onClick={() => onOpenThread(message)} {...getStyles('threadSummary')}>
        {content}
      </UnstyledButton>
    ) : (
      <Box {...getStyles('threadSummary')}>{content}</Box>
    );
  };

  const renderMessage = (message: ChatMessage, groupStart: boolean, highlighted: boolean) => {
    const author = usersById.get(message.authorId);
    const name = nameOf(message.authorId);
    const time = formatTime(message.createdAt, locale);
    const own = message.authorId === currentUserId;
    const internal = isInternal(message);
    const { thread } = message;

    return (
      <Message
        compact={!groupStart}
        mod={{
          internal,
          selected: message.id === selectedId,
          highlighted,
          'message-id': message.id,
        }}
        unstyled={unstyled}
        {...getStyles('row')}
      >
        {groupStart ? (
          <Message.Avatar src={author?.avatar} name={name} {...getStyles('avatar')} />
        ) : (
          <Message.Meta {...getStyles('gutterTime')}>{time}</Message.Meta>
        )}
        <Message.Body {...getStyles('body')}>
          {groupStart && (
            <Message.Meta {...getStyles('meta')}>
              <Text component="span" size="sm" fw={700} {...getStyles('author')}>
                {name}
              </Text>
              <Text component="span" size="xs" c="dimmed" {...getStyles('time')}>
                {time}
              </Text>
            </Message.Meta>
          )}
          {internal && (
            <Text component="div" size="xs" fw={600} {...getStyles('noteLabel')}>
              <LockIcon size={12} />
              {allLabels.internal}
            </Text>
          )}
          <Box {...getStyles('text')}>
            {message.body}
            {message.editedAt !== undefined && (
              <Text component="span" size="xs" c="dimmed" {...getStyles('edited')}>
                {allLabels.edited}
              </Text>
            )}
          </Box>
          {message.attachments && (
            <Attachments
              attachments={message.attachments}
              locale={locale}
              onOpen={onOpenAttachment && ((attachment) => onOpenAttachment(message, attachment))}
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
          {thread && thread.count > 0 && !threadParentId && renderThreadSummary(message, thread)}
        </Message.Body>
        <MessageActions
          actions={actions!}
          text={message.body}
          preview={() => getCachedPreview(message)}
          author={name}
          own={own}
          onReact={onReact && (() => onReact(message))}
          onThread={onOpenThread && !threadParentId ? () => onOpenThread(message) : undefined}
          onEdit={onEdit && own ? () => onEdit(message) : undefined}
          {...getStyles('actions')}
        />
      </Message>
    );
  };

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <MessageList<TeamThreadItem>
      ref={ref}
      controlRef={controlRef}
      items={items}
      groupWith={sameGroup}
      isOwn={(item) => item.authorId === currentUserId}
      locale={locale}
      autoScroll={autoScroll}
      unreadAfterId={unreadAfterId}
      onLoadOlder={onLoadOlder}
      hasOlder={hasOlder}
      loadingOlder={loadingOlder}
      labels={{
        newMessages: allLabels.newMessages,
        log: allLabels.log,
        loadingOlder: allLabels.loadingOlder,
      }}
      unstyled={unstyled}
      classNames={Object.fromEntries(listParts.map((part) => [part, listStyles[part].className]))}
      styles={Object.fromEntries(listParts.map((part) => [part, listStyles[part].style]))}
      {...getStyles('root')}
      {...others}
      renderItem={(item, { groupStart, highlighted }) => {
        if (isEvent(item)) {
          return (
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              title={formatTime(item.createdAt, locale)}
              {...getStyles('event')}
            >
              {item.text}
            </Text>
          );
        }

        return (
          <>
            {renderMessage(item, groupStart, highlighted)}
            {item.id === threadParentId && (
              <Divider
                label={allLabels.replies(replyCount)}
                labelPosition="left"
                {...getStyles('repliesDivider')}
              />
            )}
          </>
        );
      }}
    />
  );
});

TeamThread.displayName = 'TeamThread';
TeamThread.classes = classes;

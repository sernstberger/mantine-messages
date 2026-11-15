import {
  Avatar,
  Box,
  BoxProps,
  Divider,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  Text,
  UnstyledButton,
  useMantineTheme,
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Attachments } from '../Attachments/Attachments';
import { LockIcon } from '../icons';
import { Message } from '../Message/Message';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import {
  MessageList,
  type MessageListControl,
  type MessageListItemContext,
} from '../MessageList/MessageList';
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

// What every row shares; rebuilt only when one of these props changes
interface TeamRowShared {
  getStyles: GetStylesApi<TeamThreadFactory>;
  labels: TeamThreadLabels;
  usersById: Map<string, MessagesUser>;
  currentUserId: string;
  actions: MessageAction[];
  locale?: string;
  unstyled?: boolean;
  threadParentId?: string;
  onOpenThread?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;
}

interface TeamRowProps {
  message: ChatMessage;
  groupStart: boolean;
  highlighted: boolean;
  selected: boolean;
  shared: TeamRowShared;
}

// One message; memoised, so a thread that renders again renders only the rows that changed
const TeamRow = memo(function TeamRow({
  message,
  groupStart,
  highlighted,
  selected,
  shared,
}: TeamRowProps) {
  const { getStyles, labels, usersById, currentUserId, locale, threadParentId } = shared;
  const { onOpenThread, onReact, onEdit, onToggleReaction, onOpenAttachment } = shared;
  const nameOf = (userId: string) => usersById.get(userId)?.name ?? userId;
  const author = usersById.get(message.authorId);
  const name = nameOf(message.authorId);
  const date = toDate(message.createdAt);
  const time = formatTime(date, locale);
  const own = message.authorId === currentUserId;
  const internal = isInternal(message);
  const { thread } = message;

  // "12 replies  Last reply 2 hours ago" with the first three people who answered
  const renderThreadSummary = (summary: MessageThreadSummary) => {
    const content = (
      <>
        <Avatar.Group spacing={6} aria-hidden>
          {summary.participantIds.slice(0, 3).map((id) => (
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
          {labels.replies(summary.count)}
        </Text>
        <Text component="span" size="xs" c="dimmed">
          {labels.lastReply(formatRelative(summary.lastReplyAt, locale))}
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

  return (
    <Message
      compact={!groupStart}
      mod={{ internal, selected, highlighted, 'message-id': message.id }}
      unstyled={shared.unstyled}
      {...getStyles('row')}
    >
      {groupStart ? (
        <Message.Avatar src={author?.avatar} name={name} {...getStyles('avatar')} />
      ) : (
        <Message.Meta {...getStyles('gutterTime')}>
          {/* Follow-ups show no name, so screen readers get it here */}
          <VisuallyHidden>{name} </VisuallyHidden>
          <time dateTime={date.toISOString()}>{time}</time>
        </Message.Meta>
      )}
      <Message.Body {...getStyles('body')}>
        {groupStart && (
          <Message.Meta {...getStyles('meta')}>
            <Text component="span" size="sm" fw={700} {...getStyles('author')}>
              {name}
            </Text>
            <Text
              component="time"
              dateTime={date.toISOString()}
              size="xs"
              c="dimmed"
              {...getStyles('time')}
            >
              {time}
            </Text>
          </Message.Meta>
        )}
        {internal && (
          <Text component="div" size="xs" fw={600} {...getStyles('noteLabel')}>
            <LockIcon size={12} />
            {labels.internal}
          </Text>
        )}
        <Box {...getStyles('text')}>
          {message.body}
          {message.editedAt !== undefined && (
            <Text component="span" size="xs" c="dimmed" {...getStyles('edited')}>
              {labels.edited}
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
        {thread && thread.count > 0 && !threadParentId && renderThreadSummary(thread)}
      </Message.Body>
      <MessageActions
        actions={shared.actions}
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
});

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

  const theme = useMantineTheme();
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const allLabels = useMemo(() => ({ ...defaultLabels, ...labels }), [labels]);
  // Only a thread shows the count; elsewhere 0, so a new message keeps renderItem the same
  const replyCount = threadParentId
    ? items.filter((item) => !isEvent(item) && item.id !== threadParentId).length
    : 0;

  // Handlers are called through this, so a new handler function each render (an inline arrow)
  // does not render every row again; rows only need to know whether a handler is set
  const handlers = useRef(props);
  handlers.current = props;
  const has = [
    !!onOpenThread,
    !!onReact,
    !!onEdit,
    !!onToggleReaction,
    !!onOpenAttachment,
  ] as const;

  // getStyles is new each render, but what it returns only changes with these props and the theme
  const shared = useMemo<TeamRowShared>(
    () => ({
      getStyles,
      labels: allLabels,
      usersById,
      currentUserId,
      actions: actions!,
      locale,
      unstyled,
      threadParentId,
      onOpenThread: has[0] ? (message) => handlers.current.onOpenThread!(message) : undefined,
      onReact: has[1] ? (message) => handlers.current.onReact!(message) : undefined,
      onEdit: has[2] ? (message) => handlers.current.onEdit!(message) : undefined,
      onToggleReaction: has[3]
        ? (message, emoji) => handlers.current.onToggleReaction!(message, emoji)
        : undefined,
      onOpenAttachment: has[4]
        ? (message, attachment) => handlers.current.onOpenAttachment!(message, attachment)
        : undefined,
    }),
    [
      classNames,
      styles,
      unstyled,
      vars,
      attributes,
      theme,
      allLabels,
      usersById,
      currentUserId,
      actions,
      locale,
      threadParentId,
      ...has,
    ]
  );

  const renderItem = useCallback(
    (item: TeamThreadItem, { groupStart, highlighted }: MessageListItemContext<TeamThreadItem>) => {
      const { getStyles: styled, labels: text } = shared;

      if (isEvent(item)) {
        const date = toDate(item.createdAt);
        const time = formatTime(date, shared.locale);

        return (
          <Text size="xs" c="dimmed" ta="center" title={time} {...styled('event')}>
            {item.text}
            <VisuallyHidden>
              {' '}
              <time dateTime={date.toISOString()}>{time}</time>
            </VisuallyHidden>
          </Text>
        );
      }

      return (
        <>
          <TeamRow
            message={item}
            groupStart={groupStart}
            highlighted={highlighted}
            selected={item.id === selectedId}
            shared={shared}
          />
          {item.id === threadParentId && (
            <Divider
              label={text.replies(replyCount)}
              labelPosition="left"
              {...styled('repliesDivider')}
            />
          )}
        </>
      );
    },
    [shared, selectedId, threadParentId, replyCount]
  );

  // Same author, same visibility, close in time; events and the parent of a thread stand alone
  const sameGroup = useCallback(
    (previous: TeamThreadItem, item: TeamThreadItem) =>
      !isEvent(previous) &&
      !isEvent(item) &&
      previous.id !== threadParentId &&
      previous.authorId === item.authorId &&
      isInternal(previous) === isInternal(item) &&
      toDate(item.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow!,
    [threadParentId, groupWindow]
  );

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
      renderItem={renderItem}
    />
  );
});

TeamThread.displayName = 'TeamThread';
TeamThread.classes = classes;

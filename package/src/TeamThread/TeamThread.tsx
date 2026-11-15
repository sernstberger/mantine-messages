import {
  Avatar,
  Box,
  BoxProps,
  CompoundStylesApiProps,
  createSafeContext,
  Divider,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  MantineSize,
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
  type MessageListHandlers,
  type MessageListItemContext,
  type MessageListRowsProps,
} from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type { ChatMessage, MessageAttachment, MessagesUser, SystemEvent } from '../types';
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
  | 'threadAvatars'
  | 'threadCount'
  | 'threadLastReply'
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

/** Where an item sits in the channel, the second argument of `renderMessage` */
export interface TeamThreadMessageContext {
  /** The current user wrote the item */
  own: boolean;

  /** First item of a group: a full row with avatar, name and time */
  groupStart: boolean;

  /** Last item of a group */
  groupEnd: boolean;

  /** True for 1.6 seconds after `jumpTo` this item */
  highlighted: boolean;

  /** The item's thread is open, its `id` is `selectedId` */
  selected: boolean;

  /** Scrolls to the item with this `id`, flashes it and moves focus to it */
  jumpTo: MessageListItemContext<TeamThreadItem>['jumpTo'];
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

  /** Renders the text of a message, for example markdown with `MarkdownBody`; the plain `body` by default */
  renderBody?: (message: ChatMessage) => React.ReactNode;

  /**
   * Renders a whole item from the parts: `TeamThread.Message` for messages and `TeamThread.Event`
   * for events (items with `kind`), which is also the default
   */
  renderMessage?: (item: TeamThreadItem, context: TeamThreadMessageContext) => React.ReactNode;

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
  handlersRef?: React.Ref<MessageListHandlers>;

  /**
   * Renders the rows of the inner `MessageList`, every row by default; set it to window threads of
   * thousands of messages (see "Long threads")
   */
  rowsComponent?: React.ComponentType<MessageListRowsProps>;

  /** Width and height of avatars, numbers are converted to rem @default 36 */
  avatarSize?: MantineSize | (string & {}) | number;
}

export type TeamThreadFactory = Factory<{
  props: TeamThreadProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadStylesNames;
  staticComponents: {
    Message: typeof TeamThreadMessage;
    Author: typeof TeamThreadAuthor;
    Text: typeof TeamThreadText;
    Attachments: typeof TeamThreadAttachments;
    Reactions: typeof TeamThreadReactions;
    ThreadSummary: typeof TeamThreadThreadSummary;
    Actions: typeof TeamThreadActions;
    Event: typeof TeamThreadEvent;
  };
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

const defaultProps = {
  groupWindow: 5 * 60 * 1000,
  autoScroll: true,
  actions: ['react', 'thread', 'edit', 'copy'],
  avatarSize: 36,
} satisfies Partial<TeamThreadProps>;

const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

const isEvent = (item: TeamThreadItem): item is SystemEvent => 'kind' in item;
const isInternal = (message: ChatMessage) => message.visibility === 'internal';

interface TeamThreadContextValue {
  getStyles: GetStylesApi<TeamThreadFactory>;
  labels: TeamThreadLabels;
  usersById: Map<string, MessagesUser>;
  currentUserId: string;
  actions: MessageAction[];
  locale?: string;
  unstyled?: boolean;
  avatarSize: TeamThreadProps['avatarSize'];
  threadParentId?: string;
  renderBody?: (message: ChatMessage) => React.ReactNode;
  renderMessage: (item: TeamThreadItem, context: TeamThreadMessageContext) => React.ReactNode;
  onOpenThread?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;
}

const [TeamThreadProvider, useTeamThreadContext] = createSafeContext<TeamThreadContextValue>(
  'TeamThread component was not found in tree'
);

interface TeamThreadMessageContextValue extends TeamThreadMessageContext {
  message: ChatMessage;
  name: string;
  internal: boolean;
  date: Date;
  time: string;
}

const [TeamThreadMessageProvider, useTeamThreadMessageContext] =
  createSafeContext<TeamThreadMessageContextValue>(
    'TeamThread.Message component was not found in tree'
  );

const nameOf = (usersById: Map<string, MessagesUser>, userId: string) =>
  usersById.get(userId)?.name ?? userId;

export type TeamThreadAuthorStylesNames = 'meta' | 'author' | 'time';

export interface TeamThreadAuthorProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadAuthorFactory>, ElementProps<'div'> {}

export type TeamThreadAuthorFactory = Factory<{
  props: TeamThreadAuthorProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadAuthorStylesNames;
  compound: true;
}>;

/** Name and time above the first message of a group, nothing on follow-ups */
export const TeamThreadAuthor = factory<TeamThreadAuthorFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'TeamThreadAuthor',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { groupStart, name, date, time } = useTeamThreadMessageContext();

  if (!groupStart) {
    return null;
  }

  return (
    <Message.Meta
      ref={ref}
      {...ctx.getStyles('meta', { className, style, classNames, styles })}
      {...others}
    >
      <Text
        component="span"
        size="sm"
        unstyled={ctx.unstyled}
        {...ctx.getStyles('author', { classNames, styles })}
      >
        {name}
      </Text>
      <Text
        component="time"
        dateTime={date.toISOString()}
        size="xs"
        unstyled={ctx.unstyled}
        {...ctx.getStyles('time', { classNames, styles })}
      >
        {time}
      </Text>
    </Message.Meta>
  );
});

TeamThreadAuthor.displayName = 'TeamThreadAuthor';
TeamThreadAuthor.classes = classes;

export type TeamThreadTextStylesNames = 'noteLabel' | 'text' | 'edited';

export interface TeamThreadTextProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadTextFactory>, ElementProps<'div'> {
  /** The text; `renderBody` of the thread, or the plain `body`, by default */
  children?: React.ReactNode;
}

export type TeamThreadTextFactory = Factory<{
  props: TeamThreadTextProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadTextStylesNames;
  compound: true;
}>;

/** Text of the message, with "Internal note" above an internal note and "(edited)" after an edited one */
export const TeamThreadText = factory<TeamThreadTextFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, children, ...others } = useProps(
    'TeamThreadText',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { message, internal } = useTeamThreadMessageContext();

  return (
    <>
      {internal && (
        <Text
          component="div"
          size="xs"
          unstyled={ctx.unstyled}
          {...ctx.getStyles('noteLabel', { classNames, styles })}
        >
          <LockIcon size={12} />
          {ctx.labels.internal}
        </Text>
      )}
      <Box
        ref={ref}
        {...ctx.getStyles('text', { className, style, classNames, styles })}
        {...others}
      >
        {children ?? (ctx.renderBody ? ctx.renderBody(message) : message.body)}
        {message.editedAt !== undefined && (
          <Text
            component="span"
            size="xs"
            unstyled={ctx.unstyled}
            {...ctx.getStyles('edited', { classNames, styles })}
          >
            {ctx.labels.edited}
          </Text>
        )}
      </Box>
    </>
  );
});

TeamThreadText.displayName = 'TeamThreadText';
TeamThreadText.classes = classes;

export type TeamThreadAttachmentsStylesNames = 'attachments';

export interface TeamThreadAttachmentsProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadAttachmentsFactory>, ElementProps<'div'> {}

export type TeamThreadAttachmentsFactory = Factory<{
  props: TeamThreadAttachmentsProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadAttachmentsStylesNames;
  compound: true;
}>;

/** Files of the message, nothing when it has none */
export const TeamThreadAttachments = factory<TeamThreadAttachmentsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'TeamThreadAttachments',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { message } = useTeamThreadMessageContext();
  const { onOpenAttachment } = ctx;

  if (!message.attachments) {
    return null;
  }

  return (
    <Attachments
      ref={ref}
      attachments={message.attachments}
      locale={ctx.locale}
      unstyled={ctx.unstyled}
      onOpen={onOpenAttachment && ((attachment) => onOpenAttachment(message, attachment))}
      {...ctx.getStyles('attachments', { className, style, classNames, styles })}
      {...others}
    />
  );
});

TeamThreadAttachments.displayName = 'TeamThreadAttachments';
TeamThreadAttachments.classes = classes;

export type TeamThreadReactionsStylesNames = 'reactions';

export interface TeamThreadReactionsProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadReactionsFactory>, ElementProps<'div'> {}

export type TeamThreadReactionsFactory = Factory<{
  props: TeamThreadReactionsProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadReactionsStylesNames;
  compound: true;
}>;

/** Reactions of the message, toggle buttons with `onToggleReaction`; nothing when it has none */
export const TeamThreadReactions = factory<TeamThreadReactionsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'TeamThreadReactions',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { message } = useTeamThreadMessageContext();
  const { onToggleReaction } = ctx;

  if (!message.reactions) {
    return null;
  }

  return (
    <Reactions
      ref={ref}
      reactions={message.reactions}
      currentUserId={ctx.currentUserId}
      unstyled={ctx.unstyled}
      onToggleReaction={onToggleReaction && ((emoji) => onToggleReaction(message, emoji))}
      {...ctx.getStyles('reactions', { className, style, classNames, styles })}
      {...others}
    />
  );
});

TeamThreadReactions.displayName = 'TeamThreadReactions';
TeamThreadReactions.classes = classes;

export type TeamThreadThreadSummaryStylesNames =
  | 'threadSummary'
  | 'threadAvatars'
  | 'threadCount'
  | 'threadLastReply';

export interface TeamThreadThreadSummaryProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadThreadSummaryFactory>, ElementProps<'div'> {}

export type TeamThreadThreadSummaryFactory = Factory<{
  props: TeamThreadThreadSummaryProps;
  ref: HTMLElement;
  stylesNames: TeamThreadThreadSummaryStylesNames;
  compound: true;
}>;

/**
 * "12 replies" with the people who answered and the time of the last reply; a button with
 * `onOpenThread`. Nothing without replies and in a thread (`threadParentId`)
 */
export const TeamThreadThreadSummary = factory<TeamThreadThreadSummaryFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'TeamThreadThreadSummary',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { message } = useTeamThreadMessageContext();
  const { getStyles, unstyled, usersById, onOpenThread } = ctx;
  const { thread } = message;

  if (!thread || thread.count === 0 || ctx.threadParentId) {
    return null;
  }

  const content = (
    <>
      <Avatar.Group
        spacing={6}
        aria-hidden
        unstyled={unstyled}
        {...getStyles('threadAvatars', { classNames, styles })}
      >
        {thread.participantIds.slice(0, 3).map((id) => (
          <Avatar
            key={id}
            size={20}
            radius="sm"
            unstyled={unstyled}
            src={usersById.get(id)?.avatar}
            name={nameOf(usersById, id)}
          />
        ))}
      </Avatar.Group>
      <Text
        component="span"
        size="xs"
        unstyled={unstyled}
        {...getStyles('threadCount', { classNames, styles })}
      >
        {ctx.labels.replies(thread.count)}
      </Text>
      <Text
        component="span"
        size="xs"
        unstyled={unstyled}
        {...getStyles('threadLastReply', { classNames, styles })}
      >
        {ctx.labels.lastReply(formatRelative(thread.lastReplyAt, ctx.locale))}
      </Text>
    </>
  );
  const stylesOptions = { className, style, classNames, styles };

  return onOpenThread ? (
    <UnstyledButton
      ref={ref as React.Ref<HTMLButtonElement>}
      onClick={() => onOpenThread(message)}
      unstyled={unstyled}
      {...getStyles('threadSummary', stylesOptions)}
      {...(others as ElementProps<'button'>)}
    >
      {content}
    </UnstyledButton>
  ) : (
    <Box ref={ref} {...getStyles('threadSummary', stylesOptions)} {...others}>
      {content}
    </Box>
  );
});

TeamThreadThreadSummary.displayName = 'TeamThreadThreadSummary';
TeamThreadThreadSummary.classes = classes;

export type TeamThreadActionsStylesNames = 'actions';

export interface TeamThreadActionsProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadActionsFactory>, ElementProps<'div'> {
  /** Built-in names and custom items, in order; the thread's `actions` by default */
  actions?: MessageAction[];
}

export type TeamThreadActionsFactory = Factory<{
  props: TeamThreadActionsProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadActionsStylesNames;
  compound: true;
}>;

/** React, reply in thread, edit (own messages) and copy, shown on hover and focus */
export const TeamThreadActions = factory<TeamThreadActionsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, actions, ...others } = useProps(
    'TeamThreadActions',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const { message, own, name } = useTeamThreadMessageContext();
  const { onOpenThread, onReact, onEdit, threadParentId } = ctx;

  return (
    <MessageActions
      ref={ref}
      actions={actions ?? ctx.actions}
      text={message.body}
      preview={() => getCachedPreview(message)}
      author={name}
      own={own}
      unstyled={ctx.unstyled}
      onReact={onReact && (() => onReact(message))}
      onOpenThread={onOpenThread && !threadParentId ? () => onOpenThread(message) : undefined}
      onEdit={onEdit && own ? () => onEdit(message) : undefined}
      {...ctx.getStyles('actions', { className, style, classNames, styles })}
      {...others}
    />
  );
});

TeamThreadActions.displayName = 'TeamThreadActions';
TeamThreadActions.classes = classes;

export type TeamThreadEventStylesNames = 'event';

export interface TeamThreadEventProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadEventFactory>, ElementProps<'div'> {
  /** The event, an item with `kind` */
  event: SystemEvent;
}

export type TeamThreadEventFactory = Factory<{
  props: TeamThreadEventProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadEventStylesNames;
  compound: true;
}>;

/** Centred line for an event such as "Priya joined #launch", with its time for screen readers */
export const TeamThreadEvent = factory<TeamThreadEventFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, event, ...others } = useProps(
    'TeamThreadEvent',
    null,
    _props
  );
  const ctx = useTeamThreadContext();
  const date = toDate(event.createdAt);
  const time = formatTime(date, ctx.locale);

  return (
    <Text
      ref={ref}
      size="xs"
      title={time}
      unstyled={ctx.unstyled}
      {...ctx.getStyles('event', { className, style, classNames, styles })}
      {...others}
    >
      {event.text}
      <VisuallyHidden>
        {' '}
        <time dateTime={date.toISOString()}>{time}</time>
      </VisuallyHidden>
    </Text>
  );
});

TeamThreadEvent.displayName = 'TeamThreadEvent';
TeamThreadEvent.classes = classes;

export type TeamThreadMessageStylesNames = 'row' | 'avatar' | 'gutterTime' | 'body';

export interface TeamThreadMessageProps
  extends BoxProps, CompoundStylesApiProps<TeamThreadMessageFactory>, ElementProps<'div'> {
  /** The message, the first argument of `renderMessage` */
  message: ChatMessage;

  /** Where the message sits, the second argument of `renderMessage` */
  context: TeamThreadMessageContext;

  /** After the content: `<TeamThread.Actions />` by default, `null` for none */
  actions?: React.ReactNode;

  /**
   * Content beside the avatar: `TeamThread.Author`, `TeamThread.Text`, `TeamThread.Attachments`,
   * `TeamThread.Reactions` and `TeamThread.ThreadSummary` by default
   */
  children?: React.ReactNode;
}

export type TeamThreadMessageFactory = Factory<{
  props: TeamThreadMessageProps;
  ref: HTMLDivElement;
  stylesNames: TeamThreadMessageStylesNames;
  compound: true;
}>;

/**
 * One message row: the avatar on the first message of a group, the time (shown on hover) on
 * follow-ups, then the content and the actions
 */
export const TeamThreadMessage = factory<TeamThreadMessageFactory>((_props) => {
  const {
    classNames,
    className,
    style,
    styles,
    vars,
    ref,
    mod,
    message,
    context,
    actions,
    children,
    ...others
  } = useProps('TeamThreadMessage', null, _props);
  const ctx = useTeamThreadContext();
  const { groupStart, highlighted, selected } = context;
  const author = ctx.usersById.get(message.authorId);
  const name = nameOf(ctx.usersById, message.authorId);
  const internal = isInternal(message);
  const date = toDate(message.createdAt);
  const time = formatTime(date, ctx.locale);

  return (
    <TeamThreadMessageProvider value={{ ...context, message, name, internal, date, time }}>
      <Message
        ref={ref}
        compact={!groupStart}
        mod={[{ internal, selected, highlighted, 'message-id': message.id }, mod]}
        unstyled={ctx.unstyled}
        avatarSize={ctx.avatarSize}
        {...ctx.getStyles('row', { className, style, classNames, styles })}
        {...others}
      >
        {groupStart ? (
          <Message.Avatar
            src={author?.avatar}
            name={name}
            {...ctx.getStyles('avatar', { classNames, styles })}
          />
        ) : (
          <Message.Meta {...ctx.getStyles('gutterTime', { classNames, styles })}>
            {/* Follow-ups show no name, so screen readers get it here */}
            <VisuallyHidden>{name} </VisuallyHidden>
            <time dateTime={date.toISOString()}>{time}</time>
          </Message.Meta>
        )}
        <Message.Body {...ctx.getStyles('body', { classNames, styles })}>
          {children ?? (
            <>
              <TeamThreadAuthor />
              <TeamThreadText />
              <TeamThreadAttachments />
              <TeamThreadReactions />
              <TeamThreadThreadSummary />
            </>
          )}
        </Message.Body>
        {actions === undefined ? <TeamThreadActions /> : actions}
      </Message>
    </TeamThreadMessageProvider>
  );
});

TeamThreadMessage.displayName = 'TeamThreadMessage';
TeamThreadMessage.classes = classes;

const defaultRenderMessage = (item: TeamThreadItem, context: TeamThreadMessageContext) =>
  isEvent(item) ? (
    <TeamThreadEvent event={item} />
  ) : (
    <TeamThreadMessage message={item} context={context} />
  );

interface TeamRowProps extends Omit<TeamThreadMessageContext, 'own'> {
  item: TeamThreadItem;
  shared: TeamThreadContextValue;
}

const TeamRow = memo(function TeamRow({ item, shared, ...context }: TeamRowProps) {
  const own = item.authorId === shared.currentUserId;
  return shared.renderMessage(item, { ...context, own });
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
    renderBody,
    renderMessage,
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
    handlersRef,
    avatarSize,
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
  // 0 outside a thread, so a new message does not change renderItem
  const replyCount = threadParentId
    ? items.filter((item) => !isEvent(item) && item.id !== threadParentId).length
    : 0;

  // Called through a ref, so an inline handler does not render every memoized row
  const handlers = useRef(props);
  handlers.current = props;
  const has = [
    !!onOpenThread,
    !!onReact,
    !!onEdit,
    !!onToggleReaction,
    !!onOpenAttachment,
  ] as const;

  // getStyles is new each render; its result changes only with these props and the theme
  const shared = useMemo<TeamThreadContextValue>(
    () => ({
      getStyles,
      labels: allLabels,
      usersById,
      currentUserId,
      actions,
      locale,
      unstyled,
      avatarSize,
      threadParentId,
      renderBody,
      renderMessage: renderMessage ?? defaultRenderMessage,
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
      avatarSize,
      threadParentId,
      renderBody,
      renderMessage,
      ...has,
    ]
  );

  const renderItem = useCallback(
    (item: TeamThreadItem, context: MessageListItemContext<TeamThreadItem>) => (
      <>
        <TeamRow
          item={item}
          groupStart={context.groupStart}
          groupEnd={context.groupEnd}
          highlighted={context.highlighted}
          selected={item.id === selectedId}
          jumpTo={context.jumpTo}
          shared={shared}
        />
        {item.id === threadParentId && (
          <Divider
            label={shared.labels.replies(replyCount)}
            labelPosition="left"
            unstyled={shared.unstyled}
            {...shared.getStyles('repliesDivider')}
          />
        )}
      </>
    ),
    [shared, selectedId, threadParentId, replyCount]
  );

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
    <TeamThreadProvider value={shared}>
      <MessageList<TeamThreadItem>
        ref={ref}
        handlersRef={handlersRef}
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
    </TeamThreadProvider>
  );
});

TeamThread.displayName = 'TeamThread';
TeamThread.classes = classes;
TeamThread.Message = TeamThreadMessage;
TeamThread.Author = TeamThreadAuthor;
TeamThread.Text = TeamThreadText;
TeamThread.Attachments = TeamThreadAttachments;
TeamThread.Reactions = TeamThreadReactions;
TeamThread.ThreadSummary = TeamThreadThreadSummary;
TeamThread.Actions = TeamThreadActions;
TeamThread.Event = TeamThreadEvent;

export namespace TeamThread {
  export type Props = TeamThreadProps;
  export type StylesNames = TeamThreadStylesNames;
  export type Factory = TeamThreadFactory;
  export type Labels = TeamThreadLabels;

  export namespace Message {
    export type Props = TeamThreadMessageProps;
    export type StylesNames = TeamThreadMessageStylesNames;
    export type Factory = TeamThreadMessageFactory;
  }

  export namespace Author {
    export type Props = TeamThreadAuthorProps;
    export type StylesNames = TeamThreadAuthorStylesNames;
    export type Factory = TeamThreadAuthorFactory;
  }

  export namespace Text {
    export type Props = TeamThreadTextProps;
    export type StylesNames = TeamThreadTextStylesNames;
    export type Factory = TeamThreadTextFactory;
  }

  export namespace Attachments {
    export type Props = TeamThreadAttachmentsProps;
    export type StylesNames = TeamThreadAttachmentsStylesNames;
    export type Factory = TeamThreadAttachmentsFactory;
  }

  export namespace Reactions {
    export type Props = TeamThreadReactionsProps;
    export type StylesNames = TeamThreadReactionsStylesNames;
    export type Factory = TeamThreadReactionsFactory;
  }

  export namespace ThreadSummary {
    export type Props = TeamThreadThreadSummaryProps;
    export type StylesNames = TeamThreadThreadSummaryStylesNames;
    export type Factory = TeamThreadThreadSummaryFactory;
  }

  export namespace Actions {
    export type Props = TeamThreadActionsProps;
    export type StylesNames = TeamThreadActionsStylesNames;
    export type Factory = TeamThreadActionsFactory;
  }

  export namespace Event {
    export type Props = TeamThreadEventProps;
    export type StylesNames = TeamThreadEventStylesNames;
    export type Factory = TeamThreadEventFactory;
  }
}

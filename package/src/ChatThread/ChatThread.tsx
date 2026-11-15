import {
  Avatar,
  Box,
  BoxProps,
  CompoundStylesApiProps,
  createSafeContext,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getRadius,
  getSize,
  GetStylesApi,
  MantineColor,
  MantineRadius,
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
import { ReplyIcon } from '../icons';
import { MessageActions, type MessageAction } from '../MessageActions/MessageActions';
import {
  MessageList,
  type MessageListHandlers,
  type MessageListItemContext,
} from '../MessageList/MessageList';
import { Reactions } from '../Reactions/Reactions';
import type { ChatMessage, MessageAttachment, MessageStatus, MessagesUser } from '../types';
import { toDate } from '../utils/dates';
import { formatTime } from '../utils/format';
import { getCachedPreview } from '../utils/preview';
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

export type ChatThreadCssVariables = {
  root:
    | '--chat-thread-radius'
    | '--chat-thread-own-bg'
    | '--chat-thread-own-color'
    | '--chat-thread-avatar-size'
    | '--chat-thread-row-max-width';
};

export interface ChatThreadLabels extends Record<MessageStatus, string> {
  /** Accessible label of the reply button */
  reply: string;

  /** Quote of a message that is not in `messages`, for example not loaded yet */
  unavailable: string;

  /** Caption above a quoted message; `own` and `toOwn` say which side is the current user */
  repliedTo: (names: { author: string; original: string; own: boolean; toOwn: boolean }) => string;

  /** Line above the first unread message */
  newMessages: string;

  /** Said by screen readers before the current user's own messages */
  you: string;

  /** Accessible name of the message log, unless `aria-label` is set */
  log: string;

  /** Accessible label of the loader shown while older messages load */
  loadingOlder: string;
}

/** Where a message sits in the thread, the second argument of `renderMessage` */
export interface ChatThreadMessageContext {
  /** The message this one answers: `null` when it is not in `messages`, `undefined` when this is not a reply */
  original: ChatMessage | null | undefined;

  /** The current user wrote the message */
  own: boolean;

  /** First message of a group */
  groupStart: boolean;

  /** Last message of a group */
  groupEnd: boolean;

  /** True for 1.6 seconds after `jumpTo` this message */
  highlighted: boolean;

  /** The current user's newest message, the one that shows its status */
  lastOwn: boolean;

  /** Scrolls to the message with this `id`, flashes it and moves focus to it */
  jumpTo: MessageListItemContext<ChatMessage>['jumpTo'];
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
   * Renders a whole message row from the parts (`ChatThread.Message`, `ChatThread.Bubble` and the
   * rest); `<ChatThread.Message message={message} context={context} />` by default
   */
  renderMessage?: (message: ChatMessage, context: ChatThreadMessageContext) => React.ReactNode;

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
  handlersRef?: React.Ref<MessageListHandlers>;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of bubbles and quotes, numbers are converted to rem @default 'lg' */
  radius?: MantineRadius;

  /** Key of `theme.colors` or any valid CSS color to set the background of the current user's bubbles @default theme.primaryColor */
  color?: MantineColor;

  /** If set, adjusts the text color of the current user's bubbles based on `color` */
  autoContrast?: boolean;

  /** Width and height of avatars, numbers are converted to rem @default 'sm' */
  avatarSize?: MantineSize | (string & {}) | number;
}

export type ChatThreadFactory = Factory<{
  props: ChatThreadProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadStylesNames;
  vars: ChatThreadCssVariables;
  staticComponents: {
    Message: typeof ChatThreadMessage;
    Avatar: typeof ChatThreadAvatar;
    Quote: typeof ChatThreadQuote;
    Bubble: typeof ChatThreadBubble;
    Actions: typeof ChatThreadActions;
    Attachments: typeof ChatThreadAttachments;
    Reactions: typeof ChatThreadReactions;
    Meta: typeof ChatThreadMeta;
  };
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
  you: 'You',
  log: 'Messages',
  loadingOlder: 'Loading older messages',
};

const defaultProps = {
  groupWindow: 5 * 60 * 1000,
  withAuthors: true,
  autoScroll: true,
  actions: ['reply', 'react', 'edit'],
  avatarSize: 'sm',
} satisfies Partial<ChatThreadProps>;

const varsResolver = createVarsResolver<ChatThreadFactory>(
  (theme, { radius, color, autoContrast, avatarSize }) => {
    const colors = theme.variantColorResolver({
      color: color || theme.primaryColor,
      theme,
      variant: 'filled',
      autoContrast,
    });

    return {
      root: {
        '--chat-thread-radius': radius === undefined ? undefined : getRadius(radius),
        '--chat-thread-own-bg': color ? colors.background : undefined,
        '--chat-thread-own-color': color ? colors.color : undefined,
        '--chat-thread-avatar-size': getSize(avatarSize, 'chat-thread-avatar-size'),
        '--chat-thread-row-max-width': undefined,
      },
    };
  }
);

const listParts = ['list', 'divider', 'unread', 'loader', 'item'] as const;

interface ChatThreadContextValue {
  getStyles: GetStylesApi<ChatThreadFactory>;
  unstyled?: boolean;
  avatarSize: ChatThreadProps['avatarSize'];
  labels: ChatThreadLabels;
  usersById: Map<string, MessagesUser>;
  currentUserId: string;
  withAuthors?: boolean;
  renderBody?: (message: ChatMessage) => React.ReactNode;
  renderMessage: (message: ChatMessage, context: ChatThreadMessageContext) => React.ReactNode;
  actions: MessageAction[];
  locale?: string;
  onReply?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onOpenAttachment?: (message: ChatMessage, attachment: MessageAttachment) => void;
}

const [ChatThreadProvider, useChatThreadContext] = createSafeContext<ChatThreadContextValue>(
  'ChatThread component was not found in tree'
);

interface ChatThreadMessageContextValue extends ChatThreadMessageContext {
  message: ChatMessage;
  author: MessagesUser | undefined;
  name: string;
  showAuthor: boolean;
  date: Date;
  time: string;
}

const [ChatThreadMessageProvider, useChatThreadMessageContext] =
  createSafeContext<ChatThreadMessageContextValue>(
    'ChatThread.Message component was not found in tree'
  );

const nameOf = (usersById: Map<string, MessagesUser>, userId: string) =>
  usersById.get(userId)?.name ?? userId;

export type ChatThreadAvatarStylesNames = 'avatar' | 'avatarSpace';

export interface ChatThreadAvatarProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadAvatarFactory>, ElementProps<'div'> {}

export type ChatThreadAvatarFactory = Factory<{
  props: ChatThreadAvatarProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadAvatarStylesNames;
  compound: true;
}>;

/** Avatar of another person on the last message of a group, a space of its width on the others */
export const ChatThreadAvatar = factory<ChatThreadAvatarFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'ChatThreadAvatar',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const row = useChatThreadMessageContext();
  const stylesOptions = { className, style, classNames, styles };

  if (!row.showAuthor) {
    return null;
  }

  return row.groupEnd ? (
    <Avatar
      ref={ref}
      src={row.author?.avatar}
      name={row.name}
      size={ctx.avatarSize}
      unstyled={ctx.unstyled}
      {...ctx.getStyles('avatar', stylesOptions)}
      {...others}
    />
  ) : (
    <Box ref={ref} {...ctx.getStyles('avatarSpace', stylesOptions)} {...others} />
  );
});

ChatThreadAvatar.displayName = 'ChatThreadAvatar';
ChatThreadAvatar.classes = classes;

export type ChatThreadQuoteStylesNames = 'quoteLabel' | 'quote';

export interface ChatThreadQuoteProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadQuoteFactory>, ElementProps<'div'> {}

export type ChatThreadQuoteFactory = Factory<{
  props: ChatThreadQuoteProps;
  ref: HTMLElement;
  stylesNames: ChatThreadQuoteStylesNames;
  compound: true;
}>;

/** Caption and faded copy of the message this one answers; a click on the copy jumps to it */
export const ChatThreadQuote = factory<ChatThreadQuoteFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, mod, ...others } = useProps(
    'ChatThreadQuote',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const { original, own, name, jumpTo } = useChatThreadMessageContext();
  const { getStyles, unstyled, labels, usersById, currentUserId } = ctx;
  const stylesOptions = { className, style, classNames, styles };

  if (original === undefined) {
    return null;
  }

  if (original === null) {
    return (
      <Box
        ref={ref}
        mod={[{ unavailable: true }, mod]}
        {...getStyles('quote', stylesOptions)}
        {...others}
      >
        <Text size="xs" lineClamp={2} unstyled={unstyled}>
          {labels.unavailable}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Text size="xs" unstyled={unstyled} {...getStyles('quoteLabel', { classNames, styles })}>
        <ReplyIcon size={12} />
        {labels.repliedTo({
          author: name,
          original: nameOf(usersById, original.authorId),
          own,
          toOwn: original.authorId === currentUserId,
        })}
      </Text>
      <UnstyledButton
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={() => jumpTo(original.id)}
        unstyled={unstyled}
        mod={mod}
        {...getStyles('quote', stylesOptions)}
        {...(others as ElementProps<'button'>)}
      >
        <Text size="xs" lineClamp={2} unstyled={unstyled}>
          {getCachedPreview(original)}
        </Text>
      </UnstyledButton>
    </>
  );
});

ChatThreadQuote.displayName = 'ChatThreadQuote';
ChatThreadQuote.classes = classes;

export type ChatThreadActionsStylesNames = 'actions';

export interface ChatThreadActionsProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadActionsFactory>, ElementProps<'div'> {
  /** Built-in names and custom items, in order; the thread's `actions` by default */
  actions?: MessageAction[];
}

export type ChatThreadActionsFactory = Factory<{
  props: ChatThreadActionsProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadActionsStylesNames;
  compound: true;
}>;

/** Reply, react and edit buttons beside the bubble, shown on hover and focus */
export const ChatThreadActions = factory<ChatThreadActionsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, actions, ...others } = useProps(
    'ChatThreadActions',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const { message, own, name } = useChatThreadMessageContext();
  const { onReply, onReact, onEdit } = ctx;

  return (
    <MessageActions
      ref={ref}
      actions={actions ?? ctx.actions}
      text={message.body}
      preview={() => getCachedPreview(message)}
      author={name}
      own={own}
      labels={{ reply: ctx.labels.reply }}
      onReply={onReply && (() => onReply(message))}
      onReact={onReact && (() => onReact(message))}
      onEdit={onEdit && (() => onEdit(message))}
      unstyled={ctx.unstyled}
      {...ctx.getStyles('actions', { className, style, classNames, styles })}
      {...others}
    />
  );
});

ChatThreadActions.displayName = 'ChatThreadActions';
ChatThreadActions.classes = classes;

export type ChatThreadBubbleStylesNames = 'line' | 'bubble';

export interface ChatThreadBubbleProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadBubbleFactory>, ElementProps<'div'> {
  /** Content of the bubble; `renderBody` of the thread, or the plain `body`, by default */
  children?: React.ReactNode;

  /** Beside the bubble: `<ChatThread.Actions />` by default, `null` for none */
  actions?: React.ReactNode;
}

export type ChatThreadBubbleFactory = Factory<{
  props: ChatThreadBubbleProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadBubbleStylesNames;
  compound: true;
}>;

/** The bubble with the text, in a line with the actions */
export const ChatThreadBubble = factory<ChatThreadBubbleFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, mod, children, actions, ...others } =
    useProps('ChatThreadBubble', null, _props);
  const ctx = useChatThreadContext();
  const { message, own, name, showAuthor, groupStart, groupEnd, highlighted, date, time } =
    useChatThreadMessageContext();
  const { status } = message;

  return (
    <>
      {!(showAuthor && groupStart) && (
        <VisuallyHidden>{own ? ctx.labels.you : name}: </VisuallyHidden>
      )}
      <Box mod={{ own }} {...ctx.getStyles('line', { classNames, styles })}>
        <Box
          ref={ref}
          mod={[{ own, status, 'message-id': message.id, highlighted }, mod]}
          title={time}
          {...ctx.getStyles('bubble', { className, style, classNames, styles })}
          {...others}
        >
          {children ?? (ctx.renderBody ? ctx.renderBody(message) : message.body)}
          {!groupEnd && (
            <VisuallyHidden>
              {' '}
              <time dateTime={date.toISOString()}>{time}</time>
            </VisuallyHidden>
          )}
        </Box>
        {actions === undefined ? <ChatThreadActions /> : actions}
      </Box>
    </>
  );
});

ChatThreadBubble.displayName = 'ChatThreadBubble';
ChatThreadBubble.classes = classes;

export type ChatThreadAttachmentsStylesNames = 'attachments';

export interface ChatThreadAttachmentsProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadAttachmentsFactory>, ElementProps<'div'> {}

export type ChatThreadAttachmentsFactory = Factory<{
  props: ChatThreadAttachmentsProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadAttachmentsStylesNames;
  compound: true;
}>;

/** Files of the message, nothing when it has none */
export const ChatThreadAttachments = factory<ChatThreadAttachmentsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'ChatThreadAttachments',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const { message } = useChatThreadMessageContext();
  const { onOpenAttachment } = ctx;

  if (!message.attachments) {
    return null;
  }

  return (
    <Attachments
      ref={ref}
      attachments={message.attachments}
      locale={ctx.locale}
      onOpen={onOpenAttachment && ((attachment) => onOpenAttachment(message, attachment))}
      unstyled={ctx.unstyled}
      {...ctx.getStyles('attachments', { className, style, classNames, styles })}
      {...others}
    />
  );
});

ChatThreadAttachments.displayName = 'ChatThreadAttachments';
ChatThreadAttachments.classes = classes;

export type ChatThreadReactionsStylesNames = 'reactions';

export interface ChatThreadReactionsProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadReactionsFactory>, ElementProps<'div'> {}

export type ChatThreadReactionsFactory = Factory<{
  props: ChatThreadReactionsProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadReactionsStylesNames;
  compound: true;
}>;

/** Reactions of the message, toggle buttons with `onToggleReaction`; nothing when it has none */
export const ChatThreadReactions = factory<ChatThreadReactionsFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'ChatThreadReactions',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const { message } = useChatThreadMessageContext();
  const { onToggleReaction } = ctx;

  if (!message.reactions) {
    return null;
  }

  return (
    <Reactions
      ref={ref}
      reactions={message.reactions}
      currentUserId={ctx.currentUserId}
      onToggleReaction={onToggleReaction && ((emoji) => onToggleReaction(message, emoji))}
      unstyled={ctx.unstyled}
      {...ctx.getStyles('reactions', { className, style, classNames, styles })}
      {...others}
    />
  );
});

ChatThreadReactions.displayName = 'ChatThreadReactions';
ChatThreadReactions.classes = classes;

export type ChatThreadMetaStylesNames = 'meta' | 'status';

export interface ChatThreadMetaProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadMetaFactory>, ElementProps<'div'> {}

export type ChatThreadMetaFactory = Factory<{
  props: ChatThreadMetaProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadMetaStylesNames;
  compound: true;
}>;

/**
 * Time under the last message of a group, and the status of the current user's newest message
 * (sending and failed under every message)
 */
export const ChatThreadMeta = factory<ChatThreadMetaFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'ChatThreadMeta',
    null,
    _props
  );
  const ctx = useChatThreadContext();
  const { message, own, groupEnd, lastOwn, date, time } = useChatThreadMessageContext();
  const { status } = message;
  const showStatus = own && !!status && (lastOwn || status === 'sending' || status === 'failed');

  if (!groupEnd && !showStatus) {
    return null;
  }

  return (
    <Text
      ref={ref}
      component="div"
      size="xs"
      unstyled={ctx.unstyled}
      {...ctx.getStyles('meta', { className, style, classNames, styles })}
      {...others}
    >
      {groupEnd && <time dateTime={date.toISOString()}>{time}</time>}
      {showStatus && (
        <Box component="span" mod={{ status }} {...ctx.getStyles('status', { classNames, styles })}>
          {groupEnd && ' · '}
          {ctx.labels[status]}
        </Box>
      )}
    </Text>
  );
});

ChatThreadMeta.displayName = 'ChatThreadMeta';
ChatThreadMeta.classes = classes;

export type ChatThreadMessageStylesNames = 'row' | 'content' | 'author';

export interface ChatThreadMessageProps
  extends BoxProps, CompoundStylesApiProps<ChatThreadMessageFactory>, ElementProps<'div'> {
  /** The message, the first argument of `renderMessage` */
  message: ChatMessage;

  /** Where the message sits, the second argument of `renderMessage` */
  context: ChatThreadMessageContext;

  /** Before the content: `<ChatThread.Avatar />` by default, `null` for none */
  avatar?: React.ReactNode;

  /**
   * Content under the author's name: `ChatThread.Quote`, `ChatThread.Bubble`,
   * `ChatThread.Attachments`, `ChatThread.Reactions` and `ChatThread.Meta` by default
   */
  children?: React.ReactNode;
}

export type ChatThreadMessageFactory = Factory<{
  props: ChatThreadMessageProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadMessageStylesNames;
  compound: true;
}>;

/** One message row: the avatar, the author's name on the first message of a group, and the content */
export const ChatThreadMessage = factory<ChatThreadMessageFactory>((_props) => {
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
    avatar,
    children,
    ...others
  } = useProps('ChatThreadMessage', null, _props);
  const ctx = useChatThreadContext();
  const { own, groupStart } = context;
  const author = ctx.usersById.get(message.authorId);
  const name = nameOf(ctx.usersById, message.authorId);
  const showAuthor = !own && !!ctx.withAuthors;
  const date = toDate(message.createdAt);
  const time = formatTime(date, ctx.locale);

  return (
    <ChatThreadMessageProvider
      value={{ ...context, message, author, name, showAuthor, date, time }}
    >
      <Box
        ref={ref}
        mod={[{ own, 'group-start': groupStart }, mod]}
        {...ctx.getStyles('row', { className, style, classNames, styles })}
        {...others}
      >
        {avatar === undefined ? <ChatThreadAvatar /> : avatar}
        <Box mod={{ own }} {...ctx.getStyles('content', { classNames, styles })}>
          {showAuthor && groupStart && (
            <Text
              size="xs"
              unstyled={ctx.unstyled}
              {...ctx.getStyles('author', { classNames, styles })}
            >
              {name}
            </Text>
          )}
          {children ?? (
            <>
              <ChatThreadQuote />
              <ChatThreadBubble />
              <ChatThreadAttachments />
              <ChatThreadReactions />
              <ChatThreadMeta />
            </>
          )}
        </Box>
      </Box>
    </ChatThreadMessageProvider>
  );
});

ChatThreadMessage.displayName = 'ChatThreadMessage';
ChatThreadMessage.classes = classes;

const defaultRenderMessage = (message: ChatMessage, context: ChatThreadMessageContext) => (
  <ChatThreadMessage message={message} context={context} />
);

interface ChatRowProps extends Omit<ChatThreadMessageContext, 'own'> {
  message: ChatMessage;
  shared: ChatThreadContextValue;
}

const ChatRow = memo(function ChatRow({ message, shared, ...context }: ChatRowProps) {
  const own = message.authorId === shared.currentUserId;
  return shared.renderMessage(message, { ...context, own });
});

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
    renderMessage,
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
    handlersRef,
    radius,
    color,
    autoContrast,
    avatarSize,
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
    varsResolver,
  });

  const theme = useMantineTheme();
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages]
  );
  const allLabels = useMemo(() => ({ ...defaultLabels, ...labels }), [labels]);
  const lastOwnId = useMemo(
    () => messages.findLast((message) => message.authorId === currentUserId)?.id,
    [messages, currentUserId]
  );

  // Called through a ref, so an inline handler does not render every memoized row
  const handlers = useRef(props);
  handlers.current = props;
  const has = [!!onReply, !!onReact, !!onEdit, !!onToggleReaction, !!onOpenAttachment] as const;

  // getStyles is new each render; its result changes only with these props and the theme
  const shared = useMemo<ChatThreadContextValue>(
    () => ({
      getStyles,
      unstyled,
      avatarSize,
      labels: allLabels,
      usersById,
      currentUserId,
      withAuthors,
      renderBody,
      renderMessage: renderMessage ?? defaultRenderMessage,
      actions,
      locale,
      onReply: has[0] ? (message) => handlers.current.onReply!(message) : undefined,
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
      avatarSize,
      allLabels,
      usersById,
      currentUserId,
      withAuthors,
      renderBody,
      renderMessage,
      actions,
      locale,
      ...has,
    ]
  );

  const renderItem = useCallback(
    (message: ChatMessage, context: MessageListItemContext<ChatMessage>) => (
      <ChatRow
        message={message}
        original={
          message.replyToId === undefined
            ? undefined
            : (messagesById.get(message.replyToId) ?? null)
        }
        groupStart={context.groupStart}
        groupEnd={context.groupEnd}
        highlighted={context.highlighted}
        lastOwn={message.id === lastOwnId}
        jumpTo={context.jumpTo}
        shared={shared}
      />
    ),
    [messagesById, lastOwnId, shared]
  );

  const sameGroup = useCallback(
    (previous: ChatMessage, message: ChatMessage) =>
      previous.authorId === message.authorId &&
      toDate(message.createdAt).getTime() - toDate(previous.createdAt).getTime() <= groupWindow,
    [groupWindow]
  );

  const listStyles = Object.fromEntries(listParts.map((part) => [part, getStyles(part)]));

  return (
    <ChatThreadProvider value={shared}>
      <MessageList<ChatMessage>
        ref={ref}
        handlersRef={handlersRef}
        items={messages}
        groupWith={sameGroup}
        isOwn={(message) => message.authorId === currentUserId}
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
    </ChatThreadProvider>
  );
});

ChatThread.displayName = 'ChatThread';
ChatThread.classes = classes;
ChatThread.varsResolver = varsResolver;
ChatThread.Message = ChatThreadMessage;
ChatThread.Avatar = ChatThreadAvatar;
ChatThread.Quote = ChatThreadQuote;
ChatThread.Bubble = ChatThreadBubble;
ChatThread.Actions = ChatThreadActions;
ChatThread.Attachments = ChatThreadAttachments;
ChatThread.Reactions = ChatThreadReactions;
ChatThread.Meta = ChatThreadMeta;

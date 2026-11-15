import {
  Box,
  BoxProps,
  Center,
  Divider,
  ElementProps,
  Factory,
  genericFactory,
  Loader,
  ScrollArea,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React, { memo, useImperativeHandle } from 'react';
import type { MessageBase } from '../types';
import { dayKey } from '../utils/dates';
import { formatDay } from '../utils/format';
import classes from './MessageList.module.css';
import { useMessageList, type MessageListJumpOptions } from './use-message-list';

export type MessageListStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item';

export interface MessageListLabels {
  /** Line above the first unread item */
  newMessages: string;

  /** Accessible name of the log, unless `aria-label` is set */
  log: string;

  /** Accessible label of the loader shown while older items load */
  loadingOlder: string;
}

export interface MessageListItemContext<T extends MessageBase> {
  index: number;
  previous?: T;
  next?: T;

  /** First item of a group: the first item, after a date divider, or when `groupWith` says no */
  groupStart: boolean;

  /** Last item of a group */
  groupEnd: boolean;

  /** True for 1.6 seconds after `jumpTo` this item */
  highlighted: boolean;

  /** Scrolls to the item with this `id`, flashes it and moves focus to it (see `MessageListJumpOptions`) */
  jumpTo: (id: string, options?: MessageListJumpOptions) => void;
}

/** Handlers for code outside the list */
export interface MessageListHandlers {
  /** Scrolls to the item with this `id`, flashes it and moves focus to it (see `MessageListJumpOptions`) */
  jumpTo: (id: string, options?: MessageListJumpOptions) => void;
}

export interface MessageListProps<T extends MessageBase = MessageBase>
  extends BoxProps, StylesApiProps<MessageListFactory>, ElementProps<'div'> {
  /** Items, oldest first */
  items: T[];

  // Method syntax keeps these bivariant, so MessageListProps<T> fits the factory's MessageListProps

  /**
   * Renders one item. Each item is memoised on its own data and context, so keep this function
   * stable (`useCallback`, or defined outside the component) and only the items that changed
   * render again; a new function each render renders every item
   */
  renderItem(item: T, context: MessageListItemContext<T>): React.ReactNode;

  /** Whether `item` continues the group of `previous`; without it every item is its own group */
  groupWith?(previous: T, item: T): boolean;

  /** Whether the current user wrote the item; the list always scrolls to their new items */
  isOwn?(item: T): boolean;

  /** Locale for date dividers, the browser's by default */
  locale?: string;

  /** Divider with the date before each new day, `true` by default */
  withDateDividers?: boolean;

  /** `id` of the last read item; a "New messages" line follows it */
  unreadAfterId?: string | null;

  /** Keep the newest item in view, `true` by default */
  autoScroll?: boolean;

  /** Called when the user scrolls near the top while `hasOlder` and not `loadingOlder` */
  onLoadOlder?: () => void;

  /** More items exist before the first one */
  hasOlder?: boolean;

  /** Older items are loading; shows a loader at the top */
  loadingOlder?: boolean;

  /** Text, for translation */
  labels?: Partial<MessageListLabels>;

  /** Gets `{ jumpTo }`, so code outside the list can scroll to an item and flash it */
  handlersRef?: React.Ref<MessageListHandlers>;
}

export type MessageListFactory = Factory<{
  props: MessageListProps;
  ref: HTMLDivElement;
  stylesNames: MessageListStylesNames;
  signature: <T extends MessageBase = MessageBase>(
    props: MessageListProps<T> & { ref?: React.Ref<HTMLDivElement> }
  ) => React.JSX.Element;
}>;

const defaultProps = {
  withDateDividers: true,
  autoScroll: true,
} satisfies Partial<MessageListProps>;

const defaultLabels: MessageListLabels = {
  newMessages: 'New messages',
  log: 'Messages',
  loadingOlder: 'Loading older messages',
};

interface ItemContentProps<T extends MessageBase> extends MessageListItemContext<T> {
  item: T;
  renderItem: MessageListProps<T>['renderItem'];
}

const ItemContent = memo(function ItemContent<T extends MessageBase>({
  item,
  renderItem,
  ...context
}: ItemContentProps<T>) {
  return renderItem(item, context);
}) as <T extends MessageBase>(props: ItemContentProps<T>) => React.ReactNode;

/** A scrolling list of items; `<MessageList<T>>` types `renderItem` with your item type */
export const MessageList = genericFactory<MessageListFactory>((_props) => {
  const props = useProps('MessageList', defaultProps, _props);
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
    renderItem,
    groupWith,
    isOwn,
    locale,
    withDateDividers,
    unreadAfterId,
    autoScroll,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    handlersRef,
    role = 'log',
    'aria-live': ariaLive = 'polite',
    'aria-label': ariaLabel,
    ...others
  } = props;

  const getStyles = useStyles<MessageListFactory>({
    name: 'MessageList',
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

  const last = items[items.length - 1];
  const { viewportRef, onScrollPositionChange, jumpTo, highlightedId, busy } = useMessageList({
    autoScroll: !!autoScroll,
    firstId: items[0]?.id,
    lastId: last?.id,
    lastIsOwn: !!last && !!isOwn?.(last),
    onLoadOlder,
    hasOlder,
    loadingOlder,
  });
  const allLabels = { ...defaultLabels, ...labels };
  useImperativeHandle(handlersRef, () => ({ jumpTo }), [jumpTo]);

  const newDay = (a: MessageBase | undefined, b: MessageBase) =>
    !!withDateDividers && (!a || dayKey(a.createdAt) !== dayKey(b.createdAt));

  return (
    <ScrollArea
      ref={ref}
      viewportRef={viewportRef}
      onScrollPositionChange={onScrollPositionChange}
      {...getStyles('root')}
      {...others}
    >
      <Box
        role={role}
        aria-live={ariaLive}
        aria-label={ariaLabel ?? allLabels.log}
        aria-busy={busy || undefined}
        {...getStyles('list')}
      >
        {loadingOlder && (
          <Center {...getStyles('loader')}>
            <Loader
              size="sm"
              unstyled={unstyled}
              role="progressbar"
              aria-label={allLabels.loadingOlder}
            />
          </Center>
        )}
        {items.map((item, index) => {
          const previous = items[index - 1];
          const next = items[index + 1];
          const dayStarts = newDay(previous, item);
          const groupStart = !previous || dayStarts || !groupWith?.(previous, item);
          const groupEnd = !next || newDay(item, next) || !groupWith?.(item, next);

          return (
            <React.Fragment key={item.id}>
              {dayStarts && (
                <Divider
                  label={formatDay(item.createdAt, locale)}
                  labelPosition="center"
                  unstyled={unstyled}
                  {...getStyles('divider')}
                />
              )}
              <Box data-item-id={item.id} {...getStyles('item')}>
                <ItemContent
                  item={item}
                  renderItem={renderItem}
                  index={index}
                  previous={previous}
                  next={next}
                  groupStart={groupStart}
                  groupEnd={groupEnd}
                  highlighted={highlightedId === item.id}
                  jumpTo={jumpTo}
                />
              </Box>
              {item.id === unreadAfterId && next && (
                <Divider
                  label={allLabels.newMessages}
                  labelPosition="center"
                  color="red"
                  unstyled={unstyled}
                  {...getStyles('unread')}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
    </ScrollArea>
  );
});

MessageList.displayName = 'MessageList';
MessageList.classes = classes;

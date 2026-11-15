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
import React, { useImperativeHandle } from 'react';
import type { MessageBase } from '../types';
import { dayKey } from '../utils/dates';
import { formatDay } from '../utils/format';
import classes from './MessageList.module.css';
import { useMessageList } from './use-message-list';

export type MessageListStylesNames = 'root' | 'list' | 'divider' | 'unread' | 'loader' | 'item';

export interface MessageListLabels {
  /** Line above the first unread item */
  newMessages: string;
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

  /** Scrolls to the item with this `id` and flashes it */
  jumpTo: (id: string) => void;
}

/** What `controlRef` gives code outside the list */
export interface MessageListControl {
  /** Scrolls to the item with this `id` and flashes it */
  jumpTo: (id: string) => void;
}

export interface MessageListProps<T extends MessageBase = MessageBase>
  extends BoxProps, StylesApiProps<MessageListFactory>, ElementProps<'div'> {
  /** Items, oldest first */
  items: T[];

  // Method syntax keeps these bivariant, so MessageListProps<T> fits the factory's MessageListProps

  /** Renders one item */
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
  controlRef?: React.Ref<MessageListControl>;
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

const defaultLabels: MessageListLabels = { newMessages: 'New messages' };

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
    controlRef,
    role = 'log',
    'aria-live': ariaLive = 'polite',
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
  const { viewportRef, onScrollPositionChange, jumpTo, highlightedId } = useMessageList({
    autoScroll: !!autoScroll,
    firstId: items[0]?.id,
    lastId: last?.id,
    lastIsOwn: !!last && !!isOwn?.(last),
    onLoadOlder,
    hasOlder,
    loadingOlder,
  });
  const allLabels = { ...defaultLabels, ...labels };
  useImperativeHandle(controlRef, () => ({ jumpTo }));

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
      <Box role={role} aria-live={ariaLive} {...getStyles('list')}>
        {loadingOlder && (
          <Center {...getStyles('loader')}>
            <Loader size="sm" />
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
                  {...getStyles('divider')}
                />
              )}
              <Box data-item-id={item.id} {...getStyles('item')}>
                {renderItem(item, {
                  index,
                  previous,
                  next,
                  groupStart,
                  groupEnd,
                  highlighted: highlightedId === item.id,
                  jumpTo,
                })}
              </Box>
              {item.id === unreadAfterId && next && (
                <Divider
                  label={allLabels.newMessages}
                  labelPosition="center"
                  color="red"
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

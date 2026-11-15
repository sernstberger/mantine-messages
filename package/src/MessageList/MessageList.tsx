import {
  Box,
  BoxProps,
  Center,
  CompoundStylesApiProps,
  createSafeContext,
  Divider,
  ElementProps,
  factory,
  Factory,
  genericFactory,
  GetStylesApi,
  Loader,
  ScrollArea,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import React, { memo, useImperativeHandle, useMemo } from 'react';
import type { MessageBase } from '../types';
import { useDateSettings } from '../MessagesProvider/use-messages-context';
import { formatDay, type DateSettings } from '../utils/format';
import { getMessageListRows, type MessageListRowData } from './get-message-list-rows';
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

/** Set by a `rowsComponent` that renders only some rows, so `jumpTo` reaches the others */
export interface MessageListRowsHandlers {
  /** Scrolls until the row at `index` of `rows` is rendered and in view */
  scrollToIndex: (index: number) => void;
}

/** Props of `rowsComponent` */
export interface MessageListRowsProps<T extends MessageBase = MessageBase> {
  /** Every row, oldest first: items, date dividers and the unread line; render each with `MessageList.Row` */
  rows: MessageListRowData<T>[];

  /** The scrolling element (the `ScrollArea` viewport), for example for `getScrollElement` of a virtualizer */
  viewportRef: React.RefObject<HTMLDivElement | null>;

  /** Set `{ scrollToIndex }` here when only some rows are rendered, so `jumpTo` reaches the rest */
  handlersRef: React.Ref<MessageListRowsHandlers>;
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

  /** Locale for date dividers, from `MessagesProvider` (`'en'` without one) by default */
  locale?: string;

  /** IANA time zone that decides where days start, from `MessagesProvider` (the runtime's without one) by default */
  timeZone?: string;

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

  /**
   * Renders the rows; every row by default. For threads of thousands of items, a component that
   * renders only the rows in view with a virtualizer, for example `@tanstack/react-virtual`
   */
  rowsComponent?: React.ComponentType<MessageListRowsProps>;
}

export type MessageListFactory = Factory<{
  props: MessageListProps;
  ref: HTMLDivElement;
  stylesNames: MessageListStylesNames;
  staticComponents: {
    Row: typeof MessageListRow;
  };
  signature: <T extends MessageBase = MessageBase>(
    props: MessageListProps<T> & { ref?: React.Ref<HTMLDivElement> }
  ) => React.JSX.Element;
}>;

interface MessageListContextValue {
  getStyles: GetStylesApi<MessageListFactory>;
  unstyled: boolean | undefined;
  dates: DateSettings;
  newMessages: string;
  renderItem: MessageListProps['renderItem'];
  highlightedId: string | null;
  jumpTo: MessageListItemContext<MessageBase>['jumpTo'];
}

const [MessageListProvider, useMessageListContext] = createSafeContext<MessageListContextValue>(
  'MessageList.Row must be used inside the rowsComponent of MessageList'
);

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

export interface MessageListRowProps
  extends BoxProps, CompoundStylesApiProps<MessageListRowFactory>, ElementProps<'div'> {
  /** The row, from `rows` of `rowsComponent`; set `style` and `ref` to position and measure it */
  row: MessageListRowData;
}

export type MessageListRowFactory = Factory<{
  props: MessageListRowProps;
  ref: HTMLDivElement;
  stylesNames: MessageListStylesNames;
  compound: true;
}>;

/** One row of the list: an item, a date divider or the unread line */
export const MessageListRow = factory<MessageListRowFactory>((_props) => {
  const { classNames, className, style, styles, vars, row, ...others } = useProps(
    'MessageListRow',
    null,
    _props
  );
  const ctx = useMessageListContext();
  const stylesOptions = { className, style, classNames, styles };

  if (row.type === 'item') {
    return (
      <Box data-item-id={row.key} {...ctx.getStyles('item', stylesOptions)} {...others}>
        <ItemContent
          item={row.item}
          renderItem={ctx.renderItem}
          index={row.index}
          previous={row.previous}
          next={row.next}
          groupStart={row.groupStart}
          groupEnd={row.groupEnd}
          highlighted={ctx.highlightedId === row.key}
          jumpTo={ctx.jumpTo}
        />
      </Box>
    );
  }

  return row.type === 'divider' ? (
    <Divider
      label={formatDay(row.date, ctx.dates)}
      labelPosition="center"
      unstyled={ctx.unstyled}
      {...ctx.getStyles('divider', stylesOptions)}
      {...others}
    />
  ) : (
    <Divider
      label={ctx.newMessages}
      labelPosition="center"
      color="red"
      unstyled={ctx.unstyled}
      {...ctx.getStyles('unread', stylesOptions)}
      {...others}
    />
  );
});

MessageListRow.displayName = 'MessageListRow';
MessageListRow.classes = classes;

function MessageListAllRows({ rows }: MessageListRowsProps) {
  return rows.map((row) => <MessageListRow key={row.key} row={row} />);
}

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
    timeZone,
    withDateDividers,
    unreadAfterId,
    autoScroll,
    onLoadOlder,
    hasOlder,
    loadingOlder,
    labels,
    handlersRef,
    rowsComponent: Rows = MessageListAllRows,
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

  const dates = useDateSettings(locale, timeZone);
  const rows = useMemo(
    () =>
      getMessageListRows(items, {
        groupWith,
        withDateDividers,
        unreadAfterId,
        timeZone: dates.timeZone,
      }),
    [items, groupWith, withDateDividers, unreadAfterId, dates.timeZone]
  );

  const last = items[items.length - 1];
  const { viewportRef, rowsHandlersRef, onScrollPositionChange, jumpTo, highlightedId, busy } =
    useMessageList({
      autoScroll: !!autoScroll,
      firstId: items[0]?.id,
      lastId: last?.id,
      lastIsOwn: !!last && !!isOwn?.(last),
      onLoadOlder,
      hasOlder,
      loadingOlder,
      rows,
    });
  const allLabels = { ...defaultLabels, ...labels };
  useImperativeHandle(handlersRef, () => ({ jumpTo }), [jumpTo]);

  return (
    <ScrollArea
      ref={ref}
      viewportRef={viewportRef}
      onScrollPositionChange={onScrollPositionChange}
      unstyled={unstyled}
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
        <MessageListProvider
          value={{
            getStyles,
            unstyled,
            dates,
            newMessages: allLabels.newMessages,
            renderItem,
            highlightedId,
            jumpTo,
          }}
        >
          <Rows rows={rows} viewportRef={viewportRef} handlersRef={rowsHandlersRef} />
        </MessageListProvider>
      </Box>
    </ScrollArea>
  );
});

MessageList.displayName = 'MessageList';
MessageList.classes = classes;
MessageList.Row = MessageListRow;

export namespace MessageList {
  export type Props = MessageListProps;
  export type StylesNames = MessageListStylesNames;
  export type Factory = MessageListFactory;
  export type Labels = MessageListLabels;

  export namespace Row {
    export type Props = MessageListRowProps;
    export type StylesNames = MessageListStylesNames;
    export type Factory = MessageListRowFactory;
  }
}

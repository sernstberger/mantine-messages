import {
  Avatar,
  Badge,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  StylesApiProps,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import React from 'react';
import type { Conversation } from '../types';
import { formatShort } from '../utils/format';
import classes from './Inbox.module.css';

export type InboxStylesNames =
  | 'root'
  | 'item'
  | 'avatar'
  | 'body'
  | 'title'
  | 'time'
  | 'preview'
  | 'unread'
  | 'empty';

export interface InboxProps
  extends BoxProps, StylesApiProps<InboxFactory>, ElementProps<'div', 'onChange' | 'defaultValue'> {
  /** Conversations in the order to show them */
  conversations: Conversation[];

  /** `id` of the open conversation, controlled */
  value?: string | null;

  /** `id` of the open conversation at first, uncontrolled */
  defaultValue?: string | null;

  /** Called with the `id` of the conversation the user opens */
  onChange?: (id: string) => void;

  /** Locale for times, the browser's by default */
  locale?: string;

  /** Shown when there are no conversations, `'No conversations'` by default */
  emptyLabel?: React.ReactNode;
}

export type InboxFactory = Factory<{
  props: InboxProps;
  ref: HTMLDivElement;
  stylesNames: InboxStylesNames;
}>;

const defaultProps: Partial<InboxProps> = {
  emptyLabel: 'No conversations',
};

export const Inbox = factory<InboxFactory>((_props) => {
  const props = useProps('Inbox', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    conversations,
    value,
    defaultValue,
    onChange,
    locale,
    emptyLabel,
    ...others
  } = props;

  const getStyles = useStyles<InboxFactory>({
    name: 'Inbox',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const [selected, setSelected] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: null,
    onChange: (id) => id !== null && onChange?.(id),
  });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {conversations.length === 0 && <Box {...getStyles('empty')}>{emptyLabel}</Box>}
      {conversations.map((conversation) => {
        const unread = conversation.unreadCount ?? 0;
        const active = conversation.id === selected;

        return (
          <UnstyledButton
            key={conversation.id}
            aria-current={active ? 'true' : undefined}
            mod={{ active, unread: unread > 0, muted: conversation.muted }}
            onClick={() => setSelected(conversation.id)}
            {...getStyles('item')}
          >
            <Avatar src={conversation.avatar} name={conversation.title} {...getStyles('avatar')} />
            <Box {...getStyles('body')}>
              <Box {...getStyles('title')}>{conversation.title}</Box>
              {conversation.lastMessage && (
                <Box {...getStyles('time')}>
                  {formatShort(conversation.lastMessage.createdAt, locale)}
                </Box>
              )}
              <Box {...getStyles('preview')}>{conversation.lastMessage?.body}</Box>
              {unread > 0 && (
                <Badge size="sm" circle={unread < 10} {...getStyles('unread')}>
                  {unread > 99 ? '99+' : unread}
                </Badge>
              )}
            </Box>
          </UnstyledButton>
        );
      })}
    </Box>
  );
});

Inbox.displayName = 'Inbox';
Inbox.classes = classes;

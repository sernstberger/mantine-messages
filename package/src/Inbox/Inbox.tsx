import {
  Avatar,
  Badge,
  Box,
  BoxProps,
  ElementProps,
  EmptyState,
  factory,
  Factory,
  StylesApiProps,
  Text,
  TextInput,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import { useId, useUncontrolled } from '@mantine/hooks';
import React from 'react';
import { HashIcon, SearchIcon } from '../icons';
import type { Conversation } from '../types';
import { formatShort } from '../utils/format';
import { getPreview } from '../utils/preview';
import classes from './Inbox.module.css';

export type InboxStylesNames =
  | 'root'
  | 'search'
  | 'section'
  | 'sectionLabel'
  | 'item'
  | 'avatar'
  | 'body'
  | 'title'
  | 'time'
  | 'preview'
  | 'unread'
  | 'empty';

/** A heading and the conversations under it */
export interface InboxSection {
  id: string;
  label: React.ReactNode;

  /** Whether a conversation belongs here; each one goes in the first section that matches */
  match: (conversation: Conversation) => boolean;
}

export interface InboxLabels {
  /** Placeholder and accessible label of the search box */
  search: string;

  /** Shown when the search matches nothing */
  noResults: string;

  /** Heading of the built-in section for `pinned` conversations */
  pinned: string;

  /** Heading of the built-in section for `kind: 'channel'` */
  channels: string;

  /** Heading of the built-in section for everything else */
  direct: string;
}

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

  /** Show a search box above the list */
  withSearch?: boolean;

  /** Search text, controlled; filters by title, with or without the search box */
  search?: string;

  /** Search text at first, uncontrolled */
  defaultSearch?: string;

  /** Called when the search text changes */
  onSearchChange?: (search: string) => void;

  /**
   * `true` for Pinned, Channels and Direct messages (from `pinned` and `kind`), or your own
   * sections; conversations that no section matches are left out
   */
  sections?: boolean | InboxSection[];

  /** Text, for translation */
  labels?: Partial<InboxLabels>;
}

export type InboxFactory = Factory<{
  props: InboxProps;
  ref: HTMLDivElement;
  stylesNames: InboxStylesNames;
}>;

const defaultProps: Partial<InboxProps> = {
  emptyLabel: 'No conversations',
};

const defaultLabels: InboxLabels = {
  search: 'Search',
  noResults: 'No matches',
  pinned: 'Pinned',
  channels: 'Channels',
  direct: 'Direct messages',
};

// Pinned first, then channels, then everything else
const builtInSections = (labels: InboxLabels): InboxSection[] => [
  { id: 'pinned', label: labels.pinned, match: (conversation) => !!conversation.pinned },
  {
    id: 'channels',
    label: labels.channels,
    match: (conversation) => conversation.kind === 'channel',
  },
  { id: 'direct', label: labels.direct, match: () => true },
];

export const Inbox = factory<InboxFactory>((_props) => {
  const props = useProps('Inbox', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    conversations,
    value,
    defaultValue,
    onChange,
    locale,
    emptyLabel,
    withSearch,
    search,
    defaultSearch,
    onSearchChange,
    sections,
    labels,
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
    attributes,
  });

  const [selected, setSelected] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: null,
    onChange: (id) => id !== null && onChange?.(id),
  });
  const [query, setQuery] = useUncontrolled({
    value: search,
    defaultValue: defaultSearch,
    finalValue: '',
    onChange: onSearchChange,
  });
  const sectionId = useId();
  const allLabels = { ...defaultLabels, ...labels };
  const needle = query.trim().toLocaleLowerCase();
  const shown = conversations.filter((conversation) =>
    conversation.title.toLocaleLowerCase().includes(needle)
  );
  const groups = sections === true ? builtInSections(allLabels) : sections || null;

  const renderConversation = (conversation: Conversation) => {
    const unread = conversation.unreadCount ?? 0;
    const active = conversation.id === selected;
    const channel = conversation.kind === 'channel';

    return (
      <UnstyledButton
        key={conversation.id}
        aria-current={active ? 'true' : undefined}
        mod={{ active, unread: unread > 0, muted: conversation.muted, channel }}
        onClick={() => setSelected(conversation.id)}
        {...getStyles('item')}
      >
        <Avatar src={conversation.avatar} name={conversation.title} {...getStyles('avatar')}>
          {channel && <HashIcon />}
        </Avatar>
        <Box {...getStyles('body')}>
          <Text component="span" size="sm" truncate {...getStyles('title')}>
            {conversation.title}
          </Text>
          {conversation.lastMessage && (
            <Text component="span" size="xs" c="dimmed" {...getStyles('time')}>
              {formatShort(conversation.lastMessage.createdAt, locale)}
            </Text>
          )}
          <Text component="span" size="sm" truncate {...getStyles('preview')}>
            {conversation.lastMessage && getPreview(conversation.lastMessage)}
          </Text>
          {unread > 0 && (
            <Badge size="sm" circle={unread < 10} {...getStyles('unread')}>
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Box>
      </UnstyledButton>
    );
  };

  const renderSections = (list: InboxSection[]) =>
    list.map((section) => {
      const members = shown.filter(
        (conversation) => list.find((candidate) => candidate.match(conversation)) === section
      );

      if (members.length === 0) {
        return null;
      }

      const labelId = `${sectionId}-${section.id}`;

      return (
        <Box key={section.id} role="group" aria-labelledby={labelId} {...getStyles('section')}>
          <Text id={labelId} size="xs" fw={600} c="dimmed" {...getStyles('sectionLabel')}>
            {section.label}
          </Text>
          {members.map(renderConversation)}
        </Box>
      );
    });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {withSearch && (
        <TextInput
          size="xs"
          radius="md"
          leftSection={<SearchIcon size={14} />}
          placeholder={allLabels.search}
          aria-label={allLabels.search}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          {...getStyles('search')}
        />
      )}
      {shown.length === 0 && (
        <EmptyState
          size="sm"
          title={conversations.length === 0 ? emptyLabel : allLabels.noResults}
          {...getStyles('empty')}
        />
      )}
      {groups ? renderSections(groups) : shown.map(renderConversation)}
    </Box>
  );
});

Inbox.displayName = 'Inbox';
Inbox.classes = classes;

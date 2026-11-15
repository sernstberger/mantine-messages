import {
  Avatar,
  Badge,
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  EmptyState,
  factory,
  Factory,
  getRadius,
  MantineColor,
  MantineRadius,
  StylesApiProps,
  Text,
  TextInput,
  GetStylesApi,
  UnstyledButton,
  useMantineTheme,
  useProps,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import { useDebouncedValue, useId, useUncontrolled } from '@mantine/hooks';
import React, { memo, useCallback, useMemo, useRef } from 'react';
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

  /** Shown when there are no conversations */
  empty: string;

  /** Shown when the search matches nothing */
  noResults: string;

  /** Heading of the built-in section for `pinned` conversations */
  pinned: string;

  /** Heading of the built-in section for `kind: 'channel'` */
  channels: string;

  /** Heading of the built-in section for everything else */
  direct: string;

  /** Read after a conversation with unread messages, in place of the bare number on its badge */
  unread: (count: number) => string;

  /** Read after a muted conversation */
  muted: string;

  /** Announced politely a moment after the search text changes, while it filters the list */
  results: (count: number) => string;
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

  /** Show a search box above the list */
  withSearch?: boolean;

  /** Controlled search value, filters by title with or without the search box */
  searchValue?: string;

  /** Default search value */
  defaultSearchValue?: string;

  /** Called when search changes */
  onSearchChange?: (value: string) => void;

  /**
   * `true` for Pinned, Channels and Direct messages (from `pinned` and `kind`), or your own
   * sections; conversations that no section matches are left out
   */
  sections?: boolean | InboxSection[];

  /** Text, for translation */
  labels?: Partial<InboxLabels>;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of rows and the search box, numbers are converted to rem @default 'md' */
  radius?: MantineRadius;

  /** Key of `theme.colors` or any valid CSS color to color the open conversation and the unread badges @default theme.primaryColor */
  color?: MantineColor;

  /** If set, adjusts the text color of the open conversation based on `color` */
  autoContrast?: boolean;
}

export type InboxCssVariables = {
  root: '--inbox-radius' | '--inbox-active-bg' | '--inbox-active-color' | '--inbox-active-hover';
};

export type InboxFactory = Factory<{
  props: InboxProps;
  ref: HTMLDivElement;
  stylesNames: InboxStylesNames;
  vars: InboxCssVariables;
}>;

const defaultLabels: InboxLabels = {
  search: 'Search',
  empty: 'No conversations',
  noResults: 'No matches',
  pinned: 'Pinned',
  channels: 'Channels',
  direct: 'Direct messages',
  unread: (count) => `${count} unread`,
  muted: 'Muted',
  results: (count) => (count === 1 ? '1 conversation' : `${count} conversations`),
};

const builtInSections = (labels: InboxLabels): InboxSection[] => [
  { id: 'pinned', label: labels.pinned, match: (conversation) => !!conversation.pinned },
  {
    id: 'channels',
    label: labels.channels,
    match: (conversation) => conversation.kind === 'channel',
  },
  { id: 'direct', label: labels.direct, match: () => true },
];

const varsResolver = createVarsResolver<InboxFactory>(
  (theme, { radius, color, variant, autoContrast }) => {
    const colors = theme.variantColorResolver({
      color: color || theme.primaryColor,
      theme,
      variant: variant || 'light',
      autoContrast,
    });

    return {
      root: {
        '--inbox-radius': radius === undefined ? undefined : getRadius(radius),
        '--inbox-active-bg': color || variant ? colors.background : undefined,
        '--inbox-active-color': color || variant ? colors.color : undefined,
        '--inbox-active-hover': color || variant ? colors.hover : undefined,
      },
    };
  }
);

type GetStyles = GetStylesApi<InboxFactory>;

interface InboxRowProps {
  conversation: Conversation;
  active: boolean;
  locale: string | undefined;
  labels: InboxLabels;
  getStyles: GetStyles;
  color: MantineColor | undefined;
  unstyled: boolean | undefined;
  onSelect: (id: string) => void;
}

const InboxRow = memo(function InboxRow({
  conversation,
  active,
  locale,
  labels,
  getStyles,
  color,
  unstyled,
  onSelect,
}: InboxRowProps) {
  const unread = conversation.unreadCount ?? 0;
  const channel = conversation.kind === 'channel';

  return (
    <UnstyledButton
      aria-current={active ? 'true' : undefined}
      mod={{ active, unread: unread > 0, muted: conversation.muted, channel }}
      onClick={() => onSelect(conversation.id)}
      unstyled={unstyled}
      {...getStyles('item')}
    >
      <Avatar
        src={conversation.avatar}
        name={conversation.title}
        unstyled={unstyled}
        {...getStyles('avatar')}
      >
        {channel && <HashIcon />}
      </Avatar>
      <Box {...getStyles('body')}>
        <Text component="span" size="sm" truncate unstyled={unstyled} {...getStyles('title')}>
          {conversation.title}
        </Text>
        {conversation.lastMessage && (
          <Text component="span" size="xs" unstyled={unstyled} {...getStyles('time')}>
            {formatShort(conversation.lastMessage.createdAt, locale)}
          </Text>
        )}
        <Text component="span" size="sm" truncate unstyled={unstyled} {...getStyles('preview')}>
          {conversation.lastMessage && getPreview(conversation.lastMessage)}
        </Text>
        {unread > 0 && (
          // aria-hidden: the bare number reads as "3"; screen readers get labels.unread instead
          <Badge
            size="sm"
            circle={unread < 10}
            color={color}
            aria-hidden
            unstyled={unstyled}
            {...getStyles('unread')}
          >
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
        {unread > 0 && <VisuallyHidden>, {labels.unread(unread)}</VisuallyHidden>}
        {conversation.muted && <VisuallyHidden>, {labels.muted}</VisuallyHidden>}
      </Box>
    </UnstyledButton>
  );
});

export const Inbox = factory<InboxFactory>((_props) => {
  const props = useProps('Inbox', {}, _props);
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
    withSearch,
    searchValue,
    defaultSearchValue,
    onSearchChange,
    sections,
    labels,
    radius,
    color,
    autoContrast,
    ...others
  } = props;

  const theme = useMantineTheme();
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
    varsResolver,
  });

  const [selected, setSelected] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: null,
    onChange: (id) => id !== null && onChange?.(id),
  });
  const [query, setQuery] = useUncontrolled({
    value: searchValue,
    defaultValue: defaultSearchValue,
    finalValue: '',
    onChange: onSearchChange,
  });
  const sectionId = useId();

  // Stable while typing, so memoized rows skip rendering (getStyles is new on every render)
  const rowStyles = useMemo(
    () => getStyles,
    [theme, classNames, styles, unstyled, vars, attributes]
  );
  const labelsKey = JSON.stringify(labels ?? {});
  const allLabels = useMemo(
    () => ({ ...defaultLabels, ...labels }),
    [labelsKey, labels?.unread, labels?.results]
  );
  const select = useRef(setSelected);
  select.current = setSelected;
  const onSelect = useCallback((id: string) => select.current(id), []);

  const needle = query.trim().toLocaleLowerCase();
  const shown = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.title.toLocaleLowerCase().includes(needle)
      ),
    [conversations, needle]
  );
  const groups = useMemo(
    () => (sections === true ? builtInSections(allLabels) : sections || null),
    [sections, allLabels]
  );

  const members = useMemo(() => {
    const bySection = new Map<InboxSection, Conversation[]>();

    if (groups) {
      groups.forEach((section) => bySection.set(section, []));
      shown.forEach((conversation) => {
        const section = groups.find((candidate) => candidate.match(conversation));

        if (section) {
          bySection.get(section)!.push(conversation);
        }
      });
    }

    return bySection;
  }, [groups, shown]);

  const [announcement] = useDebouncedValue(
    needle ? (shown.length === 0 ? allLabels.noResults : allLabels.results(shown.length)) : '',
    300
  );

  const renderConversation = (conversation: Conversation) => (
    <InboxRow
      key={conversation.id}
      conversation={conversation}
      active={conversation.id === selected}
      locale={locale}
      labels={allLabels}
      getStyles={rowStyles}
      color={color}
      unstyled={unstyled}
      onSelect={onSelect}
    />
  );

  const renderSections = (list: InboxSection[]) =>
    list.map((section) => {
      const sectionMembers = members.get(section)!;

      if (sectionMembers.length === 0) {
        return null;
      }

      const labelId = `${sectionId}-${section.id}`;

      return (
        <Box key={section.id} role="group" aria-labelledby={labelId} {...getStyles('section')}>
          <Text id={labelId} size="xs" unstyled={unstyled} {...getStyles('sectionLabel')}>
            {section.label}
          </Text>
          {sectionMembers.map(renderConversation)}
        </Box>
      );
    });

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {withSearch && (
        <TextInput
          size="xs"
          radius={radius ?? 'md'}
          leftSection={<SearchIcon size={14} />}
          unstyled={unstyled}
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
          unstyled={unstyled}
          title={conversations.length === 0 ? allLabels.empty : allLabels.noResults}
          {...getStyles('empty')}
        />
      )}
      {groups ? renderSections(groups) : shown.map(renderConversation)}
      <VisuallyHidden role="status">{announcement}</VisuallyHidden>
    </Box>
  );
});

Inbox.displayName = 'Inbox';
Inbox.classes = classes;
Inbox.varsResolver = varsResolver;

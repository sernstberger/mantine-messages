import {
  ActionIcon,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  Menu,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import React, { useState } from 'react';
import {
  CheckIcon,
  CopyIcon,
  DotsIcon,
  EditIcon,
  ReplyIcon,
  SmileIcon,
  ThreadIcon,
} from '../icons';
import { truncate } from '../utils/preview';
import classes from './MessageActions.module.css';

export type MessageActionName = 'reply' | 'react' | 'thread' | 'edit' | 'copy';

export interface MessageActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: MantineColor;
}

export type MessageAction = MessageActionName | MessageActionItem;

export interface MessageActionsLabels {
  reply: string;
  react: string;
  thread: string;
  edit: string;
  copy: string;
  copied: string;

  /** The button that opens the overflow menu */
  more: string;
}

export type MessageActionsStylesNames = 'root' | 'action';

export interface MessageActionsProps
  extends BoxProps, StylesApiProps<MessageActionsFactory>, ElementProps<'div'> {
  /** Built-in names and custom items, in order */
  actions: MessageAction[];

  /** Plain text of the message, for button labels and the copy action */
  text: string;

  /** Plain text for button labels when `text` is markdown; `text` by default */
  preview?: string;
  onReply?: () => void;
  onReact?: () => void;
  onThread?: () => void;
  onEdit?: () => void;

  /** Buttons shown before the rest go in a menu, 3 by default */
  maxVisible?: number;

  /** Text, for translation */
  labels?: Partial<MessageActionsLabels>;
}

export type MessageActionsFactory = Factory<{
  props: MessageActionsProps;
  ref: HTMLDivElement;
  stylesNames: MessageActionsStylesNames;
}>;

const defaultLabels: MessageActionsLabels = {
  reply: 'Reply',
  react: 'React',
  thread: 'Reply in thread',
  edit: 'Edit',
  copy: 'Copy',
  copied: 'Copied',
  more: 'More actions',
};

const defaultProps: Partial<MessageActionsProps> = { maxVisible: 3 };

export const MessageActions = factory<MessageActionsFactory>((_props) => {
  const props = useProps('MessageActions', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    actions,
    text,
    preview,
    onReply,
    onReact,
    onThread,
    onEdit,
    maxVisible,
    labels,
    mod,
    ...others
  } = props;

  const getStyles = useStyles<MessageActionsFactory>({
    name: 'MessageActions',
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

  const allLabels = { ...defaultLabels, ...labels };
  const clipboard = useClipboard({ timeout: 1500 });
  const [menuOpen, setMenuOpen] = useState(false);

  const builtIns: Record<MessageActionName, MessageActionItem | null> = {
    reply: onReply
      ? { id: 'reply', label: allLabels.reply, icon: <ReplyIcon />, onClick: onReply }
      : null,
    react: onReact
      ? { id: 'react', label: allLabels.react, icon: <SmileIcon />, onClick: onReact }
      : null,
    thread: onThread
      ? { id: 'thread', label: allLabels.thread, icon: <ThreadIcon />, onClick: onThread }
      : null,
    edit: onEdit
      ? { id: 'edit', label: allLabels.edit, icon: <EditIcon />, onClick: onEdit }
      : null,
    copy: {
      id: 'copy',
      label: clipboard.copied ? allLabels.copied : allLabels.copy,
      icon: clipboard.copied ? <CheckIcon /> : <CopyIcon />,
      onClick: () => clipboard.copy(text),
    },
  };

  const resolved = actions
    .map((action) => (typeof action === 'string' ? builtIns[action] : action))
    .filter((action): action is MessageActionItem => action !== null);

  if (resolved.length === 0) {
    return null;
  }

  const overflow = resolved.length > maxVisible!;
  const visible = overflow ? resolved.slice(0, maxVisible! - 1) : resolved;
  const rest = overflow ? resolved.slice(maxVisible! - 1) : [];
  const short = truncate(preview ?? text, 80);

  return (
    <Box ref={ref} mod={[{ 'menu-open': menuOpen }, mod]} {...getStyles('root')} {...others}>
      {visible.map((action) => (
        <ActionIcon
          key={action.id}
          variant="subtle"
          color={action.color ?? 'gray'}
          size="sm"
          radius="xl"
          aria-label={`${action.label}: ${short}`}
          onClick={action.onClick}
          {...getStyles('action')}
        >
          {action.icon}
        </ActionIcon>
      ))}
      {overflow && (
        <Menu position="bottom-end" onChange={setMenuOpen}>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              aria-label={allLabels.more}
              {...getStyles('action')}
            >
              <DotsIcon />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {rest.map((action) => (
              <Menu.Item
                key={action.id}
                leftSection={action.icon}
                color={action.color}
                onClick={action.onClick}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Box>
  );
});

MessageActions.displayName = 'MessageActions';
MessageActions.classes = classes;

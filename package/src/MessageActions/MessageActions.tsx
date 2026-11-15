import {
  ActionIcon,
  Box,
  BoxProps,
  ElementProps,
  factory,
  Factory,
  MantineColor,
  MantineRadius,
  MantineSize,
  Menu,
  StylesApiProps,
  useDirection,
  useProps,
  useStyles,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/** Whose message the actions belong to, for the labels of the toolbar and the menu button */
export interface MessageActionsOwner {
  /** Name of the author, from the `author` prop */
  author?: string;

  /** The current user wrote the message, from the `own` prop */
  own?: boolean;
}

export interface MessageActionsLabels {
  reply: string;
  react: string;
  thread: string;
  edit: string;
  copy: string;
  copied: string;

  /** The button that opens the overflow menu, for example "More actions for Maya's message" */
  more: (owner: MessageActionsOwner) => string;

  /** Accessible name of the toolbar, for example "Actions for Maya's message" */
  toolbar: (owner: MessageActionsOwner) => string;
}

export type MessageActionsStylesNames = 'root' | 'action' | 'menu' | 'menuItem';

export interface MessageActionsProps
  extends BoxProps, StylesApiProps<MessageActionsFactory>, ElementProps<'div'> {
  /** Built-in names and custom items, in order */
  actions: MessageAction[];

  /** Text of the message: the copy action copies it, and button labels show it unless `preview` is set */
  text: string;

  /**
   * Plain text for button labels when `text` is markdown; `text` by default. A function is called
   * only when a button shows, so a thread skips stripping markdown for rows without actions
   */
  preview?: string | (() => string);

  /** Name of the author, for the labels of the toolbar and the menu button */
  author?: string;

  /** The current user wrote the message, for the labels of the toolbar and the menu button */
  own?: boolean;
  onReply?: () => void;
  onReact?: () => void;
  onOpenThread?: () => void;
  onEdit?: () => void;

  /** Buttons shown before the rest go in a menu, 3 by default */
  maxVisible?: number;

  /** Text, for translation */
  labels?: Partial<MessageActionsLabels>;

  /** Controls the size of the buttons @default 'sm' */
  size?: MantineSize | (string & {});

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of the buttons and the menu, numbers are converted to rem @default 'xl' for the buttons, the theme's for the menu */
  radius?: MantineRadius;

  /** Variant of the buttons @default 'subtle' */
  variant?: string;

  /** Key of `theme.colors` or any valid CSS color of the buttons, a custom item's `color` wins @default 'gray' */
  color?: MantineColor;
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
  more: ({ author, own }) =>
    own
      ? 'More actions for your message'
      : author
        ? `More actions for ${author}'s message`
        : 'More actions',
  toolbar: ({ author, own }) =>
    own
      ? 'Actions for your message'
      : author
        ? `Actions for ${author}'s message`
        : 'Message actions',
};

const defaultProps = {
  maxVisible: 3,
  size: 'sm',
  variant: 'subtle',
  color: 'gray',
} satisfies Partial<MessageActionsProps>;

type Clipboard = ReturnType<typeof useClipboard>;

// useClipboard keeps a timer, so only toolbars with a copy action mount one
function WithClipboard({ children }: { children: (clipboard: Clipboard) => React.ReactNode }) {
  return children(useClipboard({ timeout: 1500 }));
}

// `step` is -1 in right-to-left layouts
const KEYS: Record<string, (index: number, count: number, step: number) => number> = {
  ArrowRight: (index, count, step) => (index + step + count) % count,
  ArrowLeft: (index, count, step) => (index - step + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

/**
 * Buttons for one message, as a toolbar: one tab stop, arrow keys move between the buttons and
 * Home and End jump to the ends (the WAI-ARIA toolbar pattern). Built-ins show when their handler
 * is set; past `maxVisible` the rest go in a menu, mounted on first use
 */
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
    author,
    own,
    onReply,
    onReact,
    onOpenThread,
    onEdit,
    maxVisible,
    labels,
    size,
    radius,
    variant,
    color,
    mod,
    onKeyDown,
    role = 'toolbar',
    'aria-label': ariaLabel,
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

  const { dir } = useDirection();
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(0);
  const moreRef = useRef<HTMLButtonElement>(null);

  // The menu replaces the trigger on first click: focus the new one so the menu returns focus to it
  useLayoutEffect(() => {
    if (menuMounted) {
      moreRef.current!.focus();
      setMenuOpen(true);
    }
  }, [menuMounted]);

  const allLabels = { ...defaultLabels, ...labels };
  const { reply, react, thread, edit } = allLabels;
  const resolved = useMemo(() => {
    const item = (
      id: string,
      label: string,
      icon: React.ReactNode,
      onClick: (() => void) | undefined
    ): MessageActionItem | null => (onClick ? { id, label, icon, onClick } : null);

    return actions
      .map((action) => {
        switch (action) {
          case 'reply':
            return item('reply', reply, <ReplyIcon />, onReply);
          case 'react':
            return item('react', react, <SmileIcon />, onReact);
          case 'thread':
            return item('thread', thread, <ThreadIcon />, onOpenThread);
          case 'edit':
            return item('edit', edit, <EditIcon />, onEdit);
          default:
            return action;
        }
      })
      .filter((action) => action !== null);
  }, [actions, onReply, onReact, onOpenThread, onEdit, reply, react, thread, edit]);

  if (resolved.length === 0) {
    return null;
  }

  const short = truncate(typeof preview === 'function' ? preview() : (preview ?? text), 80);
  const owner = { author, own };

  const render = (clipboard: Clipboard | null) => {
    const items = resolved.map(
      (action): MessageActionItem =>
        action === 'copy'
          ? {
              id: 'copy',
              label: clipboard!.copied ? allLabels.copied : allLabels.copy,
              icon: clipboard!.copied ? <CheckIcon /> : <CopyIcon />,
              onClick: () => clipboard!.copy(text),
            }
          : action
    );
    const overflow = items.length > maxVisible;
    const visible = overflow ? items.slice(0, maxVisible - 1) : items;
    const rest = overflow ? items.slice(maxVisible - 1) : [];
    const count = visible.length + (overflow ? 1 : 0);

    const current = Math.min(active, count - 1);
    const stop = (index: number) => ({
      tabIndex: index === current ? 0 : -1,
      onFocus: () => setActive(index),
    });

    const menu = getStyles('menu');
    const menuItem = getStyles('menuItem');

    const moreButton = (extra: React.ComponentPropsWithRef<'button'>) => (
      <ActionIcon
        variant={variant}
        color={color}
        size={size}
        radius={radius ?? 'xl'}
        unstyled={unstyled}
        aria-label={allLabels.more(owner)}
        {...stop(visible.length)}
        {...getStyles('action')}
        {...extra}
      >
        <DotsIcon />
      </ActionIcon>
    );

    return (
      <Box
        ref={ref}
        role={role}
        aria-label={ariaLabel ?? allLabels.toolbar(owner)}
        mod={[{ 'menu-open': menuOpen }, mod]}
        variant={variant}
        size={size}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          const buttons = Array.from(event.currentTarget.children) as HTMLElement[];
          const index = buttons.indexOf(event.target as HTMLElement);
          const move = KEYS[event.key];

          if (index !== -1 && move) {
            event.preventDefault();
            buttons[move(index, buttons.length, dir === 'rtl' ? -1 : 1)].focus();
          }

          onKeyDown?.(event);
        }}
        {...getStyles('root')}
        {...others}
      >
        {visible.map((action, index) => (
          <ActionIcon
            key={action.id}
            variant={variant}
            color={action.color ?? color}
            size={size}
            radius={radius ?? 'xl'}
            unstyled={unstyled}
            aria-label={`${action.label}: ${short}`}
            onClick={action.onClick}
            {...stop(index)}
            {...getStyles('action')}
          >
            {action.icon}
          </ActionIcon>
        ))}
        {overflow &&
          (menuMounted ? (
            <Menu
              position="bottom-end"
              opened={menuOpen}
              onChange={setMenuOpen}
              radius={radius}
              unstyled={unstyled}
              classNames={{ dropdown: menu.className, item: menuItem.className }}
              styles={{ dropdown: menu.style, item: menuItem.style }}
              attributes={{ dropdown: attributes?.menu, item: attributes?.menuItem }}
            >
              <Menu.Target>{moreButton({ ref: moreRef })}</Menu.Target>
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
          ) : (
            moreButton({
              'aria-haspopup': 'menu',
              'aria-expanded': false,
              onClick: () => setMenuMounted(true),
            })
          ))}
      </Box>
    );
  };

  return resolved.includes('copy') ? <WithClipboard>{render}</WithClipboard> : render(null);
});

MessageActions.displayName = 'MessageActions';
MessageActions.classes = classes;

export namespace MessageActions {
  export type Props = MessageActionsProps;
  export type StylesNames = MessageActionsStylesNames;
  export type Factory = MessageActionsFactory;
  export type Labels = MessageActionsLabels;
}

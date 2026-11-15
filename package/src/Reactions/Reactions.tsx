import {
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
import React from 'react';
import type { MessageReaction } from '../types';
import classes from './Reactions.module.css';

export type ReactionsStylesNames = 'root' | 'reaction';

export interface ReactionsLabels {
  /** Accessible label of one reaction */
  reaction: (details: { emoji: string; count: number; mine: boolean }) => string;
}

export interface ReactionsProps
  extends BoxProps, StylesApiProps<ReactionsFactory>, ElementProps<'div', 'onToggle'> {
  reactions: MessageReaction[];

  /** `id` of the person looking; their reactions are marked */
  currentUserId: string;

  /** Called with the emoji the user clicks; makes each reaction a toggle button */
  onToggle?: (emoji: string) => void;

  /** Text, for translation */
  labels?: Partial<ReactionsLabels>;
}

export type ReactionsFactory = Factory<{
  props: ReactionsProps;
  ref: HTMLDivElement;
  stylesNames: ReactionsStylesNames;
}>;

const defaultLabels: ReactionsLabels = {
  reaction: ({ emoji, count, mine }) => `${emoji} ${count}${mine ? ', including you' : ''}`,
};

export const Reactions = factory<ReactionsFactory>((_props) => {
  const props = useProps('Reactions', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    ref,
    reactions,
    currentUserId,
    onToggle,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<ReactionsFactory>({
    name: 'Reactions',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
  });

  const allLabels = { ...defaultLabels, ...labels };
  const shown = reactions.filter((reaction) => reaction.userIds.length > 0);

  if (shown.length === 0) {
    return null;
  }

  return (
    <Box ref={ref} {...getStyles('root')} {...others}>
      {shown.map(({ emoji, userIds }) => {
        const mine = userIds.includes(currentUserId);
        const label = allLabels.reaction({ emoji, count: userIds.length, mine });
        const content = (
          <>
            <span aria-hidden="true">{emoji}</span>
            <span aria-hidden="true">{userIds.length}</span>
          </>
        );

        return onToggle ? (
          <UnstyledButton
            key={emoji}
            aria-label={label}
            aria-pressed={mine}
            mod={{ active: mine }}
            onClick={() => onToggle(emoji)}
            {...getStyles('reaction')}
          >
            {content}
          </UnstyledButton>
        ) : (
          <Box
            key={emoji}
            aria-label={label}
            role="img"
            mod={{ active: mine }}
            {...getStyles('reaction')}
          >
            {content}
          </Box>
        );
      })}
    </Box>
  );
});

Reactions.displayName = 'Reactions';
Reactions.classes = classes;

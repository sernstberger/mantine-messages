import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getRadius,
  MantineColor,
  MantineRadius,
  StylesApiProps,
  UnstyledButton,
  useProps,
  useStyles,
} from '@mantine/core';
import React from 'react';
import type { MessageReaction } from '../types';
import classes from './Reactions.module.css';

export type ReactionsStylesNames = 'root' | 'reaction' | 'emoji' | 'count';

export type ReactionsCssVariables = {
  root:
    | '--reactions-radius'
    | '--reactions-active-bg'
    | '--reactions-active-color'
    | '--reactions-active-border';
};

export interface ReactionsLabels {
  /** Accessible label of one reaction */
  reaction: (details: { emoji: string; count: number; mine: boolean }) => string;
}

export interface ReactionsProps
  extends BoxProps, StylesApiProps<ReactionsFactory>, ElementProps<'div'> {
  reactions: MessageReaction[];

  /** `id` of the person looking; their reactions are marked */
  currentUserId: string;

  /** Called with the emoji the user clicks; makes each reaction a toggle button */
  onToggleReaction?: (emoji: string) => void;

  /** Text, for translation */
  labels?: Partial<ReactionsLabels>;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of reactions, numbers are converted to rem @default 'xl' */
  radius?: MantineRadius;

  /** Key of `theme.colors` or any valid CSS color to set the colors of reactions the current user made @default theme.primaryColor */
  color?: MantineColor;
}

export type ReactionsFactory = Factory<{
  props: ReactionsProps;
  ref: HTMLDivElement;
  stylesNames: ReactionsStylesNames;
  vars: ReactionsCssVariables;
}>;

const defaultLabels: ReactionsLabels = {
  reaction: ({ emoji, count, mine }) => `${emoji} ${count}${mine ? ', including you' : ''}`,
};

const varsResolver = createVarsResolver<ReactionsFactory>((theme, { radius, color }) => {
  const light = theme.variantColorResolver({
    color: color || theme.primaryColor,
    theme,
    variant: 'light',
  });
  const filled = theme.variantColorResolver({
    color: color || theme.primaryColor,
    theme,
    variant: 'filled',
  });

  return {
    root: {
      '--reactions-radius': radius === undefined ? undefined : getRadius(radius),
      '--reactions-active-bg': color ? light.background : undefined,
      '--reactions-active-color': color ? light.color : undefined,
      '--reactions-active-border': color ? filled.background : undefined,
    },
  };
});

export const Reactions = factory<ReactionsFactory>((_props) => {
  const props = useProps('Reactions', {}, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    reactions,
    currentUserId,
    onToggleReaction,
    labels,
    radius,
    color,
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
    attributes,
    varsResolver,
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
            <span aria-hidden="true" {...getStyles('emoji')}>
              {emoji}
            </span>
            <span aria-hidden="true" {...getStyles('count')}>
              {userIds.length}
            </span>
          </>
        );

        return onToggleReaction ? (
          <UnstyledButton
            key={emoji}
            aria-label={label}
            aria-pressed={mine}
            mod={{ active: mine }}
            unstyled={unstyled}
            onClick={() => onToggleReaction(emoji)}
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
Reactions.varsResolver = varsResolver;

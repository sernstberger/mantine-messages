import {
  FOCUS_CLASS_NAMES,
  Box,
  BoxProps,
  Button,
  CompoundStylesApiProps,
  createSafeContext,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getRadius,
  GetStylesApi,
  MantineRadius,
  Overlay,
  StylesApiProps,
  useProps,
  useStyles,
} from '@mantine/core';
import { useElementSize, useId, useMergedRef, useUncontrolled } from '@mantine/hooks';
import React from 'react';
import classes from './MessagesShell.module.css';

export type MessagesShellStylesNames =
  | 'root'
  | 'list'
  | 'main'
  | 'aside'
  | 'asideBackdrop'
  | 'asideToggle';
export type MessagesShellCssVariables = {
  root: '--messages-shell-radius' | '--messages-shell-list-width' | '--messages-shell-aside-width';
};

export interface MessagesShellLabels {
  /** Name of the `MessagesShell.List` region */
  list: string;

  /** Name of the `MessagesShell.Main` region */
  main: string;

  /** Name of the `MessagesShell.Aside` region */
  aside: string;

  /** Text of `MessagesShell.AsideToggle` */
  asideToggle: string;
}

interface MessagesShellContextValue {
  getStyles: GetStylesApi<MessagesShellFactory>;
  unstyled: boolean | undefined;
  labels: MessagesShellLabels;

  /** The toggle's button, so closing the overlay aside can return focus to it */
  toggleRef: React.RefObject<HTMLButtonElement | null>;

  /** The aside is narrower than `asideBreakpoint` allows: it overlays `Main` when opened */
  asideCollapsed: boolean;
  asideOpened: boolean;
  setAsideOpened: (opened: boolean) => void;
  asideId: string;
}

const [MessagesShellProvider, useMessagesShellContext] =
  createSafeContext<MessagesShellContextValue>(
    'MessagesShell.List, Main, Aside and AsideToggle must be used inside MessagesShell'
  );

export interface MessagesShellListProps
  extends BoxProps, CompoundStylesApiProps<MessagesShellListFactory>, ElementProps<'section'> {}

export type MessagesShellListFactory = Factory<{
  props: MessagesShellListProps;
  ref: HTMLElement;
  stylesNames: MessagesShellStylesNames;
  compound: true;
}>;

/**
 * The start pane (left in LTR), 300px wide by default (change it with `w`): a column whose children decide how
 * to scroll. A region named by `labels.list` unless `aria-label` says otherwise
 */
export const MessagesShellList = factory<MessagesShellListFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessagesShellList',
    {},
    _props
  );
  const ctx = useMessagesShellContext();

  return (
    <Box
      component="section"
      ref={ref}
      aria-label={ctx.labels.list}
      {...ctx.getStyles('list', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessagesShellList.displayName = 'MessagesShellList';
MessagesShellList.classes = classes;

export interface MessagesShellMainProps
  extends BoxProps, CompoundStylesApiProps<MessagesShellMainFactory>, ElementProps<'section'> {}

export type MessagesShellMainFactory = Factory<{
  props: MessagesShellMainProps;
  ref: HTMLElement;
  stylesNames: MessagesShellStylesNames;
  compound: true;
}>;

/** The middle pane: takes the rest of the width, a column. A region named by `labels.main` unless `aria-label` says otherwise */
export const MessagesShellMain = factory<MessagesShellMainFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, ...others } = useProps(
    'MessagesShellMain',
    {},
    _props
  );
  const ctx = useMessagesShellContext();

  return (
    <Box
      component="section"
      ref={ref}
      aria-label={ctx.labels.main}
      {...ctx.getStyles('main', { className, style, classNames, styles })}
      {...others}
    />
  );
});

MessagesShellMain.displayName = 'MessagesShellMain';
MessagesShellMain.classes = classes;

export interface MessagesShellAsideProps
  extends BoxProps, CompoundStylesApiProps<MessagesShellAsideFactory>, ElementProps<'aside'> {}

export type MessagesShellAsideFactory = Factory<{
  props: MessagesShellAsideProps;
  ref: HTMLElement;
  stylesNames: MessagesShellStylesNames;
  compound: true;
}>;

/**
 * The end pane (right in LTR), 280px wide by default (change it with `w`). Below `asideBreakpoint` it is
 * hidden until opened, then overlays `Main` over a backdrop; Escape or a click on the backdrop
 * closes it, and focus moves into it on open and back to the toggle on close. A complementary region
 * named by `labels.aside` unless `aria-label` says otherwise
 */
export const MessagesShellAside = factory<MessagesShellAsideFactory>((_props) => {
  const { classNames, className, style, styles, vars, ref, onKeyDown, ...others } = useProps(
    'MessagesShellAside',
    {},
    _props
  );
  const ctx = useMessagesShellContext();
  const overlay = ctx.asideCollapsed && ctx.asideOpened;
  const asideRef = React.useRef<HTMLElement>(null);
  const mergedRef = useMergedRef(ref, asideRef);
  const wasOverlay = React.useRef(overlay);

  React.useEffect(() => {
    if (overlay && !wasOverlay.current) {
      asideRef.current?.focus();
    }

    if (!overlay && wasOverlay.current) {
      const active = document.activeElement;
      if (!active || active === document.body || asideRef.current?.contains(active)) {
        ctx.toggleRef.current?.focus();
      }
    }

    wasOverlay.current = overlay;
  }, [overlay]);

  return (
    <>
      {overlay && (
        <Overlay
          aria-hidden
          color="#000"
          backgroundOpacity={0.25}
          zIndex={2}
          unstyled={ctx.unstyled}
          onClick={() => ctx.setAsideOpened(false)}
          {...ctx.getStyles('asideBackdrop')}
        />
      )}
      <Box
        component="aside"
        ref={mergedRef}
        id={ctx.asideId}
        aria-label={ctx.labels.aside}
        tabIndex={overlay ? -1 : undefined}
        hidden={ctx.asideCollapsed && !ctx.asideOpened}
        mod={{ overlay }}
        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
          onKeyDown?.(event);

          if (overlay && event.key === 'Escape') {
            ctx.setAsideOpened(false);
          }
        }}
        {...ctx.getStyles('aside', {
          className:
            [overlay && FOCUS_CLASS_NAMES.never, className].filter(Boolean).join(' ') || undefined,
          style,
          classNames,
          styles,
        })}
        {...others}
      />
    </>
  );
});

MessagesShellAside.displayName = 'MessagesShellAside';
MessagesShellAside.classes = classes;

export interface MessagesShellAsideToggleProps
  extends
    BoxProps,
    CompoundStylesApiProps<MessagesShellAsideToggleFactory>,
    ElementProps<'button'> {
  /** Label of the button, `labels.asideToggle` unless set */
  children?: React.ReactNode;
}

export type MessagesShellAsideToggleFactory = Factory<{
  props: MessagesShellAsideToggleProps;
  ref: HTMLButtonElement;
  stylesNames: MessagesShellStylesNames;
  compound: true;
}>;

/**
 * Opens and closes the aside while it is collapsed; renders nothing while the aside has room.
 * Put it anywhere inside the shell, for example in the header of `Main`
 */
export const MessagesShellAsideToggle = factory<MessagesShellAsideToggleFactory>((_props) => {
  const {
    classNames,
    className,
    style,
    styles,
    vars,
    ref,
    children,
    onClick,
    onKeyDown,
    ...others
  } = useProps('MessagesShellAsideToggle', {}, _props);
  const ctx = useMessagesShellContext();
  const mergedRef = useMergedRef(ref, ctx.toggleRef);

  if (!ctx.asideCollapsed) {
    return null;
  }

  return (
    <Button
      ref={mergedRef}
      size="compact-sm"
      unstyled={ctx.unstyled}
      variant={ctx.asideOpened ? 'light' : 'default'}
      aria-expanded={ctx.asideOpened}
      aria-controls={ctx.asideId}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        ctx.setAsideOpened(!ctx.asideOpened);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);

        if (ctx.asideOpened && event.key === 'Escape') {
          ctx.setAsideOpened(false);
        }
      }}
      {...ctx.getStyles('asideToggle', { className, style, classNames, styles })}
      {...others}
    >
      {children ?? ctx.labels.asideToggle}
    </Button>
  );
});

MessagesShellAsideToggle.displayName = 'MessagesShellAsideToggle';
MessagesShellAsideToggle.classes = classes;

export interface MessagesShellProps
  extends BoxProps, StylesApiProps<MessagesShellFactory>, ElementProps<'div'> {
  /** Draws a border around the shell */
  withBorder?: boolean;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius`, numbers are converted to rem @default `theme.defaultRadius` */
  radius?: MantineRadius;

  /**
   * Width of the shell in px below which the aside collapses: hidden until opened, then over
   * `Main`; 0 never collapses it
   * @default 960
   */
  asideBreakpoint?: number;

  /** Whether the collapsed aside is open (controlled) */
  asideOpened?: boolean;

  /** Whether the collapsed aside starts open (uncontrolled) */
  defaultAsideOpened?: boolean;

  /** Names of the panes and the text of the toggle, for translation, merged with the English defaults */
  labels?: Partial<MessagesShellLabels>;

  /** Called when the toggle or Escape opens or closes the collapsed aside */
  onAsideOpenedChange?: (opened: boolean) => void;
}

export type MessagesShellFactory = Factory<{
  props: MessagesShellProps;
  ref: HTMLDivElement;
  stylesNames: MessagesShellStylesNames;
  vars: MessagesShellCssVariables;
  staticComponents: {
    List: typeof MessagesShellList;
    Main: typeof MessagesShellMain;
    Aside: typeof MessagesShellAside;
    AsideToggle: typeof MessagesShellAsideToggle;
  };
}>;

const defaultLabels: MessagesShellLabels = {
  list: 'List',
  main: 'Main',
  aside: 'Details',
  asideToggle: 'Details',
};

const defaultProps = { asideBreakpoint: 960 } satisfies Partial<MessagesShellProps>;

const varsResolver = createVarsResolver<MessagesShellFactory>((_theme, { radius }) => ({
  root: {
    '--messages-shell-radius': radius === undefined ? undefined : getRadius(radius),
    '--messages-shell-list-width': undefined,
    '--messages-shell-aside-width': undefined,
  },
}));

/**
 * The panes of a messaging app side by side: `MessagesShell.List`, `MessagesShell.Main` and
 * `MessagesShell.Aside`, each optional. Fills the height it is given. Measures itself: below
 * `asideBreakpoint` the aside collapses behind `MessagesShell.AsideToggle`
 */
export const MessagesShell = factory<MessagesShellFactory>((_props) => {
  const props = useProps('MessagesShell', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    withBorder,
    radius,
    asideBreakpoint,
    asideOpened: asideOpenedProp,
    defaultAsideOpened,
    onAsideOpenedChange,
    labels,
    mod,
    ...others
  } = props;

  const getStyles = useStyles<MessagesShellFactory>({
    name: 'MessagesShell',
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

  const { ref: sizeRef, width } = useElementSize();
  const mergedRef = useMergedRef(ref, sizeRef);
  const asideId = useId();
  const [asideOpened, setAsideOpened] = useUncontrolled({
    value: asideOpenedProp,
    defaultValue: defaultAsideOpened,
    finalValue: false,
    onChange: onAsideOpenedChange,
  });

  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const mergedLabels = React.useMemo(() => ({ ...defaultLabels, ...labels }), [labels]);

  const asideCollapsed = width > 0 && width < asideBreakpoint;

  return (
    <MessagesShellProvider
      value={{
        getStyles,
        unstyled,
        labels: mergedLabels,
        toggleRef,
        asideCollapsed,
        asideOpened,
        setAsideOpened,
        asideId,
      }}
    >
      <Box
        ref={mergedRef}
        mod={[{ 'with-border': withBorder, 'aside-collapsed': asideCollapsed }, mod]}
        {...getStyles('root')}
        {...others}
      />
    </MessagesShellProvider>
  );
});

MessagesShell.displayName = 'MessagesShell';
MessagesShell.classes = classes;
MessagesShell.varsResolver = varsResolver;
MessagesShell.List = MessagesShellList;
MessagesShell.Main = MessagesShellMain;
MessagesShell.Aside = MessagesShellAside;
MessagesShell.AsideToggle = MessagesShellAsideToggle;

export namespace MessagesShell {
  export type Props = MessagesShellProps;
  export type StylesNames = MessagesShellStylesNames;
  export type Factory = MessagesShellFactory;
  export type CssVariables = MessagesShellCssVariables;
  export type Labels = MessagesShellLabels;

  export namespace List {
    export type Props = MessagesShellListProps;
    export type StylesNames = MessagesShellStylesNames;
    export type Factory = MessagesShellListFactory;
  }

  export namespace Main {
    export type Props = MessagesShellMainProps;
    export type StylesNames = MessagesShellStylesNames;
    export type Factory = MessagesShellMainFactory;
  }

  export namespace Aside {
    export type Props = MessagesShellAsideProps;
    export type StylesNames = MessagesShellStylesNames;
    export type Factory = MessagesShellAsideFactory;
  }

  export namespace AsideToggle {
    export type Props = MessagesShellAsideToggleProps;
    export type StylesNames = MessagesShellStylesNames;
    export type Factory = MessagesShellAsideToggleFactory;
  }
}

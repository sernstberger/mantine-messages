import {
  ActionIcon,
  Anchor,
  Box,
  BoxProps,
  Code,
  CopyButton,
  createSafeContext,
  ElementProps,
  factory,
  Factory,
  GetStylesApi,
  StylesApiProps,
  Text,
  Typography,
  useProps,
  useMantineTheme,
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import React, { memo, useMemo } from 'react';
import { CheckIcon, CopyIcon } from '../icons';
import classes from './MarkdownBody.module.css';
import {
  type MarkdownAdapter,
  type MarkdownRenderers,
  useMarkdownAdapter,
} from './MarkdownAdapterProvider';
import { splitMarkdownBlocks } from './split-blocks';

export type MarkdownBodyStylesNames =
  | 'root'
  | 'link'
  | 'code'
  | 'codeBlock'
  | 'codeHeader'
  | 'codeLanguage'
  | 'copy'
  | 'pre';

export interface MarkdownBodyLabels {
  /** Accessible label of the copy button on code blocks */
  copyCode: string;

  /** Label of the copy button for a moment after copying */
  copied: string;

  /** Hidden text after each link, which opens in a new tab */
  opensInNewTab: string;
}

export interface MarkdownBodyProps
  extends BoxProps, StylesApiProps<MarkdownBodyFactory>, ElementProps<'div', 'children'> {
  /** Markdown; raw HTML in it shows as text and never becomes elements */
  children: string;

  /**
   * Renders the markdown, replacing the adapter of the nearest `MarkdownAdapterProvider` for this
   * instance. Without either, the text shows as plain text
   */
  adapter?: MarkdownAdapter;

  /** Text, for translation */
  labels?: Partial<MarkdownBodyLabels>;
}

export type MarkdownBodyFactory = Factory<{
  props: MarkdownBodyProps;
  ref: HTMLDivElement;
  stylesNames: MarkdownBodyStylesNames;
}>;

const defaultProps: Partial<MarkdownBodyProps> = {};

const defaultLabels: MarkdownBodyLabels = {
  copyCode: 'Copy code',
  copied: 'Copied',
  opensInNewTab: '(opens in a new tab)',
};

// Renderers are module-level: a component type created per render would remount every code block
const [MarkdownBodyProvider, useMarkdownBodyContext] = createSafeContext<{
  getStyles: GetStylesApi<MarkdownBodyFactory>;
  unstyled: boolean | undefined;
  labels: MarkdownBodyLabels;
}>('MarkdownBody component was not found in the tree');

function MarkdownLink({ href, children }: React.ComponentPropsWithoutRef<'a'>) {
  const { getStyles, unstyled, labels } = useMarkdownBodyContext();

  return (
    <Anchor href={href} target="_blank" rel="noreferrer" unstyled={unstyled} {...getStyles('link')}>
      {children}
      <VisuallyHidden> {labels.opensInNewTab}</VisuallyHidden>
    </Anchor>
  );
}

function MarkdownCode({ children }: React.ComponentPropsWithoutRef<'code'>) {
  const { getStyles, unstyled } = useMarkdownBodyContext();

  return (
    <Code unstyled={unstyled} {...getStyles('code')}>
      {children}
    </Code>
  );
}

function MarkdownPre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
  const { getStyles, unstyled, labels } = useMarkdownBodyContext();
  const code = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  const text = React.Children.toArray(code.props.children).join('').replace(/\n$/, '');
  const language = /language-(\S+)/.exec(code.props.className ?? '')?.[1];

  return (
    <Box {...getStyles('codeBlock')}>
      <Box {...getStyles('codeHeader')}>
        <Text component="span" size="xs" unstyled={unstyled} {...getStyles('codeLanguage')}>
          {language}
        </Text>
        <CopyButton value={text} timeout={1500}>
          {({ copied, copy }) => (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              unstyled={unstyled}
              aria-label={copied ? labels.copied : labels.copyCode}
              onClick={copy}
              {...getStyles('copy')}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </ActionIcon>
          )}
        </CopyButton>
      </Box>
      <Code block unstyled={unstyled} {...getStyles('pre')}>
        {text}
      </Code>
    </Box>
  );
}

const renderers: MarkdownRenderers = { a: MarkdownLink, code: MarkdownCode, pre: MarkdownPre };

const MarkdownSegment = memo(function MarkdownSegment({
  text,
  adapter,
}: {
  text: string;
  adapter: MarkdownAdapter;
}) {
  return adapter.render(text, renderers);
});

export const MarkdownBody = factory<MarkdownBodyFactory>((_props) => {
  const props = useProps('MarkdownBody', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    ref,
    children,
    adapter: adapterProp,
    labels,
    ...others
  } = props;

  const getStyles = useStyles<MarkdownBodyFactory>({
    name: 'MarkdownBody',
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

  const theme = useMantineTheme();
  const labelsKey = JSON.stringify(labels ?? {});
  const allLabels = useMemo(() => ({ ...defaultLabels, ...labels }), [labelsKey]);

  // Stable across streamed tokens, so links, code and copy buttons skip rendering;
  // getStyles is new on every render, so its inputs are the dependencies
  const context = useMemo(
    () => ({ getStyles, unstyled, labels: allLabels }),
    [theme, classNames, styles, vars, attributes, unstyled, allLabels]
  );

  const contextAdapter = useMarkdownAdapter();
  const adapter = adapterProp ?? contextAdapter;
  const split = adapter.splitBlocks ?? true;

  // Block by block, so a streaming answer reparses only its last block
  const blocks = useMemo(
    () => (split ? splitMarkdownBlocks(children) : [children]),
    [children, split]
  );

  return (
    <MarkdownBodyProvider value={context}>
      <Typography ref={ref} unstyled={unstyled} {...getStyles('root')} {...others}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {/* markdown renderers put a newline between top-level elements */}
            {index > 0 && '\n'}
            <MarkdownSegment text={block} adapter={adapter} />
          </React.Fragment>
        ))}
      </Typography>
    </MarkdownBodyProvider>
  );
});

MarkdownBody.displayName = 'MarkdownBody';
MarkdownBody.classes = classes;

export namespace MarkdownBody {
  export type Props = MarkdownBodyProps;
  export type StylesNames = MarkdownBodyStylesNames;
  export type Factory = MarkdownBodyFactory;
  export type Labels = MarkdownBodyLabels;
}

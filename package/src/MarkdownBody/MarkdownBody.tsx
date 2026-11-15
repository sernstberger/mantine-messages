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
  useStyles,
  VisuallyHidden,
} from '@mantine/core';
import React, { memo, useMemo } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckIcon, CopyIcon } from '../icons';
import classes from './MarkdownBody.module.css';
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
   * Renderers by tag name, replacing the built-in ones for links (`a`), inline code (`code`) and
   * code blocks (`pre`), for example `pre` with `@mantine/code-highlight`
   */
  components?: Components;

  /**
   * Remark plugins, run after remark-gfm. A plugin can change where blocks end, so with plugins
   * the text is parsed whole instead of block by block
   */
  remarkPlugins?: Options['remarkPlugins'];

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

const defaultComponents: Components = { a: MarkdownLink, code: MarkdownCode, pre: MarkdownPre };

type PluginList = NonNullable<Options['remarkPlugins']>;

const MarkdownSegment = memo(function MarkdownSegment({
  text,
  components,
  remarkPlugins,
}: {
  text: string;
  components: Components;
  remarkPlugins: PluginList;
}) {
  return (
    <Markdown remarkPlugins={remarkPlugins} components={components}>
      {text}
    </Markdown>
  );
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
    components,
    remarkPlugins,
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

  const plugins = useMemo<PluginList>(() => [remarkGfm, ...(remarkPlugins ?? [])], [remarkPlugins]);
  const allComponents = useMemo(() => ({ ...defaultComponents, ...components }), [components]);

  // Block by block, so a streaming answer reparses only its last block
  const blocks = useMemo(
    () => (remarkPlugins ? [children] : splitMarkdownBlocks(children)),
    [children, remarkPlugins]
  );

  return (
    <MarkdownBodyProvider value={{ getStyles, unstyled, labels: { ...defaultLabels, ...labels } }}>
      <Typography ref={ref} unstyled={unstyled} {...getStyles('root')} {...others}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {/* react-markdown puts a newline between top-level elements */}
            {index > 0 && '\n'}
            <MarkdownSegment text={block} components={allComponents} remarkPlugins={plugins} />
          </React.Fragment>
        ))}
      </Typography>
    </MarkdownBodyProvider>
  );
});

MarkdownBody.displayName = 'MarkdownBody';
MarkdownBody.classes = classes;

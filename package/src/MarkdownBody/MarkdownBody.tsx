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

// The renderers below are module-level components, so their identity never changes between
// renders (a new component type would remount every code block); styles and labels reach them
// through this context
const [MarkdownBodyProvider, useMarkdownBodyContext] = createSafeContext<{
  getStyles: GetStylesApi<MarkdownBodyFactory>;
  labels: MarkdownBodyLabels;
}>('MarkdownBody component was not found in the tree');

function MarkdownLink({ href, children }: React.ComponentPropsWithoutRef<'a'>) {
  const { getStyles, labels } = useMarkdownBodyContext();

  return (
    <Anchor href={href} target="_blank" rel="noreferrer" {...getStyles('link')}>
      {children}
      <VisuallyHidden> {labels.opensInNewTab}</VisuallyHidden>
    </Anchor>
  );
}

function MarkdownCode({ children }: React.ComponentPropsWithoutRef<'code'>) {
  const { getStyles } = useMarkdownBodyContext();
  return <Code {...getStyles('code')}>{children}</Code>;
}

/** A fenced code block: react-markdown passes a `<code class="language-x">` element as the child */
function MarkdownPre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
  const { getStyles, labels } = useMarkdownBodyContext();
  const code = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  const text = React.Children.toArray(code.props.children).join('').replace(/\n$/, '');
  const language = /language-(\S+)/.exec(code.props.className ?? '')?.[1];

  return (
    <Box {...getStyles('codeBlock')}>
      <Box {...getStyles('codeHeader')}>
        <Text component="span" size="xs" c="dimmed" ff="monospace">
          {language}
        </Text>
        <CopyButton value={text} timeout={1500}>
          {({ copied, copy }) => (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={copied ? labels.copied : labels.copyCode}
              onClick={copy}
              {...getStyles('copy')}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </ActionIcon>
          )}
        </CopyButton>
      </Box>
      <Code block {...getStyles('pre')}>
        {text}
      </Code>
    </Box>
  );
}

const defaultComponents: Components = { a: MarkdownLink, code: MarkdownCode, pre: MarkdownPre };

type PluginList = NonNullable<Options['remarkPlugins']>;

/**
 * One block of the text, parsed by react-markdown. Memoized: a block whose text, components and
 * plugins are unchanged is not parsed again when MarkdownBody renders
 */
const MarkdownPiece = memo(function MarkdownPiece({
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

  // Kept while the props are the same, so the memoized blocks below can skip parsing
  const plugins = useMemo<PluginList>(() => [remarkGfm, ...(remarkPlugins ?? [])], [remarkPlugins]);
  const allComponents = useMemo(() => ({ ...defaultComponents, ...components }), [components]);

  // Top-level blocks, each parsed on its own: as an answer streams in only the last block changes,
  // so each token parses one block instead of the whole text. The blocks give the same elements
  // as the whole text (scripts/check-markdown-blocks checks this against react-markdown)
  const blocks = useMemo(
    () => (remarkPlugins ? [children] : splitMarkdownBlocks(children)),
    [children, remarkPlugins]
  );

  return (
    <MarkdownBodyProvider value={{ getStyles, labels: { ...defaultLabels, ...labels } }}>
      <Typography ref={ref} {...getStyles('root')} {...others}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {/* react-markdown puts a newline between top-level elements; keep it between blocks */}
            {index > 0 && '\n'}
            <MarkdownPiece text={block} components={allComponents} remarkPlugins={plugins} />
          </React.Fragment>
        ))}
      </Typography>
    </MarkdownBodyProvider>
  );
});

MarkdownBody.displayName = 'MarkdownBody';
MarkdownBody.classes = classes;

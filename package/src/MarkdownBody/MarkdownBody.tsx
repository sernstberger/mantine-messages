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
import React from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckIcon, CopyIcon } from '../icons';
import classes from './MarkdownBody.module.css';

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

  /** Remark plugins, run after remark-gfm */
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

export const MarkdownBody = factory<MarkdownBodyFactory>((_props) => {
  const props = useProps('MarkdownBody', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
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
  });

  return (
    <MarkdownBodyProvider value={{ getStyles, labels: { ...defaultLabels, ...labels } }}>
      <Typography ref={ref} {...getStyles('root')} {...others}>
        <Markdown
          remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
          components={{ ...defaultComponents, ...components }}
        >
          {children}
        </Markdown>
      </Typography>
    </MarkdownBodyProvider>
  );
});

MarkdownBody.displayName = 'MarkdownBody';
MarkdownBody.classes = classes;

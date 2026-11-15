import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import remarkGfm from '../../../test-utils/remark-gfm.mock';
import { MarkdownBody, MarkdownBodyProps, MarkdownBodyStylesNames } from './MarkdownBody';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const source = 'See [the docs](https://mantine.dev) and `useState`.\n\n```tsx\nconst a = 1;\n```\n';

const defaultProps: MarkdownBodyProps = { children: source };

// Mantine's render wraps the first element in a fragment: rerender the same way, or it remounts
beforeEach(() => {
  markdownRenders.length = 0;
});

describe('MarkdownBody', () => {
  tests.itSupportsSystemProps<MarkdownBodyProps, MarkdownBodyStylesNames>({
    component: MarkdownBody,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MarkdownBody',
    stylesApiSelectors: ['root', 'link', 'code', 'codeBlock', 'codeHeader', 'copy', 'pre'],
  });

  itSupportsAttributes({
    component: MarkdownBody,
    props: defaultProps,
    name: 'MarkdownBody',
    selector: 'codeBlock',
  });

  it('renders GitHub flavoured markdown and offers no way to turn raw HTML into elements', () => {
    render(<MarkdownBody>{source}</MarkdownBody>);
    const options = markdownRenders.at(-1)!;
    expect(options.remarkPlugins).toEqual([remarkGfm]);
    expect('rehypePlugins' in options).toBe(false);
    expect('skipHtml' in options).toBe(false);
    expect('urlTransform' in options).toBe(false);
  });

  it('runs the app’s remark plugins after remark-gfm, on the whole text', () => {
    const plugin = () => undefined;
    render(<MarkdownBody remarkPlugins={[plugin]}>{source}</MarkdownBody>);
    expect(markdownRenders).toHaveLength(1);
    expect(markdownRenders[0].remarkPlugins).toEqual([remarkGfm, plugin]);
    expect(markdownRenders[0].children).toBe(source);
  });

  it('parses the text block by block, with a newline between blocks as one parse gives', () => {
    const { container } = render(<MarkdownBody>{source}</MarkdownBody>);
    expect(markdownRenders.map((options) => options.children)).toEqual([
      'See [the docs](https://mantine.dev) and `useState`.\n\n',
      '```tsx\nconst a = 1;\n```\n',
    ]);
    const root = container.querySelector('.mantine-MarkdownBody-root')!;
    expect(Array.from(root.childNodes, (node) => node.nodeName)).toEqual(['DIV', '#text', 'DIV']);
    expect(root.childNodes[1].textContent).toBe('\n');
  });

  it('parses nothing again when it renders with the same text, plugins and components', () => {
    const { rerender } = render(<MarkdownBody>{source}</MarkdownBody>);
    markdownRenders.length = 0;
    rerender(
      <>
        <MarkdownBody labels={{ copied: 'Done' }}>{source}</MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(0);
  });

  it('parses only the last block as text streams in', () => {
    const first = 'Intro paragraph.\n\n- one\n- two\n\nThe answer';
    const { rerender } = render(<MarkdownBody>{first}</MarkdownBody>);
    expect(markdownRenders).toHaveLength(2);
    markdownRenders.length = 0;

    rerender(
      <>
        <MarkdownBody>{`${first} grows`}</MarkdownBody>
      </>
    );
    expect(markdownRenders.map((options) => options.children)).toEqual(['The answer grows']);

    markdownRenders.length = 0;
    rerender(
      <>
        <MarkdownBody>{`${first} grows\n\nNext block`}</MarkdownBody>
      </>
    );
    expect(markdownRenders.map((options) => options.children)).toEqual([
      'The answer grows\n\n',
      'Next block',
    ]);
  });

  it('parses again when the components change', () => {
    const components = { b: () => null };
    const { rerender } = render(<MarkdownBody components={components}>x</MarkdownBody>);
    rerender(
      <>
        <MarkdownBody components={components}>x</MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(1);
    rerender(
      <>
        <MarkdownBody components={{ ...components }}>x</MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(2);
  });

  it('opens links in a new tab without a referrer, and says so', () => {
    render(<MarkdownBody labels={{ opensInNewTab: '(new tab)' }}>{source}</MarkdownBody>);
    const link = screen.getByRole('link', { name: 'the docs (new tab)' });
    expect(link).toHaveAttribute('href', 'https://mantine.dev');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows inline code, and code blocks with their language and without the last newline', () => {
    const { container } = render(<MarkdownBody>{source}</MarkdownBody>);
    expect(screen.getByText('useState').tagName).toBe('CODE');
    expect(screen.getByText('tsx')).toBeInTheDocument();
    expect(container.querySelector('pre')!.textContent).toBe('const a = 1;');
  });

  it('copies a code block and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MarkdownBody labels={{ copied: 'Copied!' }}>{source}</MarkdownBody>);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('shows no language for a plain code block, and takes custom components', () => {
    const { container } = render(
      <MarkdownBody components={{ a: ({ children }) => <b>{children}</b> }}>
        {'```\nplain\n```\n[bold link](https://x.dev)'}
      </MarkdownBody>
    );
    expect(container.querySelector('.mantine-MarkdownBody-codeHeader')!.textContent).toBe('');
    expect(screen.getByText('bold link').tagName).toBe('B');
  });
});

import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import Markdown from 'react-markdown';
import { markdownRenders } from '../../../test-utils/react-markdown.mock';
import remarkGfm from '../../../test-utils/remark-gfm.mock';
import { MarkdownAdapterProvider, type MarkdownAdapter } from './MarkdownAdapterProvider';
import { MarkdownBody, MarkdownBodyProps, MarkdownBodyStylesNames } from './MarkdownBody';
import { plainTextMarkdownAdapter } from './plain-text-adapter';
import { createReactMarkdownAdapter } from './react-markdown-adapter';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const source = 'See [the docs](https://mantine.dev) and `useState`.\n\n```tsx\nconst a = 1;\n```\n';

const adapter = createReactMarkdownAdapter(Markdown, { remarkPlugins: [remarkGfm] });

const defaultProps: MarkdownBodyProps = { children: source, adapter };

// Mantine's render wraps the first element in a fragment: rerender the same way, or it remounts
beforeEach(() => {
  markdownRenders.length = 0;
});

describe('MarkdownBody', () => {
  tests.axe([<MarkdownBody {...defaultProps} />, <MarkdownBody>Plain **text**</MarkdownBody>]);

  it('does not render the links of earlier blocks again while a later block streams', () => {
    const probe: MarkdownAdapter = {
      render: (text, renderers) => <renderers.a href="https://mantine.dev">{text}</renderers.a>,
    };
    // Every link render reads attributes.link once, in getStyles('link')
    let linkRenders = 0;
    const attributes = {
      get link() {
        linkRenders += 1;
        return {};
      },
    };
    const markdown = (text: string) => (
      <MarkdownBody adapter={probe} attributes={attributes}>
        {text}
      </MarkdownBody>
    );
    const { rerender } = render(markdown('first\n\nsec'));

    // The first rerender remounts (the test wrapper's theme changes); the tokens after it are the measure
    rerender(markdown('first\n\nsecon'));
    linkRenders = 0;

    for (const text of ['first\n\nsecond', 'first\n\nsecond w', 'first\n\nsecond wo']) {
      rerender(markdown(text));
    }
    // One link renders per token (the last block), not every link of the answer
    expect(linkRenders).toBe(3);
  });

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
    stylesApiSelectors: [
      'root',
      'link',
      'code',
      'codeBlock',
      'codeHeader',
      'codeLanguage',
      'copy',
      'pre',
    ],
  });

  itSupportsAttributes({
    component: MarkdownBody,
    props: defaultProps,
    name: 'MarkdownBody',
    selector: 'codeBlock',
  });

  it('passes the plugins you give the adapter and no others, and no way to turn raw HTML into elements', () => {
    render(<MarkdownBody adapter={adapter}>{source}</MarkdownBody>);
    const options = markdownRenders.at(-1)!;
    expect(options.remarkPlugins).toEqual([remarkGfm]);
    expect('rehypePlugins' in options).toBe(false);
    expect('skipHtml' in options).toBe(false);
    expect('urlTransform' in options).toBe(false);
  });

  it('shows the text as plain text, with its line breaks, without an adapter', () => {
    const { container } = render(
      <MarkdownBody>{'One **bold**\r\nTwo `code`\n\nThree'}</MarkdownBody>
    );
    expect(container.querySelector('.mantine-MarkdownBody-root')!.innerHTML).toBe(
      'One **bold**<br>Two `code`<br><br>Three'
    );
    expect(markdownRenders).toHaveLength(0);
  });

  it('uses the adapter of the nearest provider, and the adapter prop over it', () => {
    const other = { render: () => <i data-testid="other" /> };
    render(
      <MarkdownAdapterProvider adapter={adapter}>
        <MarkdownBody>a</MarkdownBody>
        <MarkdownAdapterProvider adapter={plainTextMarkdownAdapter}>
          <MarkdownBody adapter={other}>b</MarkdownBody>
        </MarkdownAdapterProvider>
      </MarkdownAdapterProvider>
    );
    expect(markdownRenders.map((options) => options.children)).toEqual(['a']);
    expect(screen.getByTestId('other')).toBeInTheDocument();
  });

  it('renders with no plugins or components when the adapter has no options', () => {
    render(<MarkdownBody adapter={createReactMarkdownAdapter(Markdown)}>x</MarkdownBody>);
    expect(markdownRenders[0].remarkPlugins).toBeUndefined();
  });

  it('renders the text whole when the adapter does not split blocks', () => {
    const whole = createReactMarkdownAdapter(Markdown, {
      remarkPlugins: [remarkGfm],
      splitBlocks: false,
    });
    render(<MarkdownBody adapter={whole}>{source}</MarkdownBody>);
    expect(markdownRenders).toHaveLength(1);
    expect(markdownRenders[0].children).toBe(source);
  });

  it('gives the adapter the Mantine renderers, which the adapter components replace', () => {
    const render1 = jest.fn(() => null);
    render(<MarkdownBody adapter={{ render: render1 }}>x</MarkdownBody>);
    expect(render1).toHaveBeenCalledWith(
      'x',
      expect.objectContaining({
        a: expect.any(Function),
        code: expect.any(Function),
        pre: expect.any(Function),
      })
    );
  });

  it('parses the text block by block, with a newline between blocks as one parse gives', () => {
    const { container } = render(<MarkdownBody adapter={adapter}>{source}</MarkdownBody>);
    expect(markdownRenders.map((options) => options.children)).toEqual([
      'See [the docs](https://mantine.dev) and `useState`.\n\n',
      '```tsx\nconst a = 1;\n```\n',
    ]);
    const root = container.querySelector('.mantine-MarkdownBody-root')!;
    expect(Array.from(root.childNodes, (node) => node.nodeName)).toEqual(['DIV', '#text', 'DIV']);
    expect(root.childNodes[1].textContent).toBe('\n');
  });

  it('parses nothing again when it renders with the same text, plugins and components', () => {
    const { rerender } = render(<MarkdownBody adapter={adapter}>{source}</MarkdownBody>);
    markdownRenders.length = 0;
    rerender(
      <>
        <MarkdownBody adapter={adapter} labels={{ copied: 'Done' }}>
          {source}
        </MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(0);
  });

  it('parses only the last block as text streams in', () => {
    const first = 'Intro paragraph.\n\n- one\n- two\n\nThe answer';
    const { rerender } = render(<MarkdownBody adapter={adapter}>{first}</MarkdownBody>);
    expect(markdownRenders).toHaveLength(2);
    markdownRenders.length = 0;

    rerender(
      <>
        <MarkdownBody adapter={adapter}>{`${first} grows`}</MarkdownBody>
      </>
    );
    expect(markdownRenders.map((options) => options.children)).toEqual(['The answer grows']);

    markdownRenders.length = 0;
    rerender(
      <>
        <MarkdownBody adapter={adapter}>{`${first} grows\n\nNext block`}</MarkdownBody>
      </>
    );
    expect(markdownRenders.map((options) => options.children)).toEqual([
      'The answer grows\n\n',
      'Next block',
    ]);
  });

  it('parses again when the adapter changes', () => {
    const { rerender } = render(<MarkdownBody adapter={adapter}>x</MarkdownBody>);
    rerender(
      <>
        <MarkdownBody adapter={adapter}>x</MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(1);
    rerender(
      <>
        <MarkdownBody adapter={{ ...adapter }}>x</MarkdownBody>
      </>
    );
    expect(markdownRenders).toHaveLength(2);
  });

  it('opens links in a new tab without a referrer, and says so', () => {
    render(
      <MarkdownBody adapter={adapter} labels={{ opensInNewTab: '(new tab)' }}>
        {source}
      </MarkdownBody>
    );
    const link = screen.getByRole('link', { name: 'the docs (new tab)' });
    expect(link).toHaveAttribute('href', 'https://mantine.dev');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows inline code, and code blocks with their language and without the last newline', () => {
    const { container } = render(<MarkdownBody adapter={adapter}>{source}</MarkdownBody>);
    expect(screen.getByText('useState').tagName).toBe('CODE');
    expect(screen.getByText('tsx')).toBeInTheDocument();
    expect(container.querySelector('pre')!.textContent).toBe('const a = 1;');
  });

  it('copies a code block and says so', async () => {
    // fireEvent, not userEvent: userEvent installs its own clipboard stub over this one
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <MarkdownBody adapter={adapter} labels={{ copied: 'Copied!' }}>
        {source}
      </MarkdownBody>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('shows no language for a plain code block, and takes the adapter components', () => {
    const custom = createReactMarkdownAdapter(Markdown, {
      components: { a: ({ children }: React.ComponentPropsWithoutRef<'a'>) => <b>{children}</b> },
    });
    const { container } = render(
      <MarkdownBody adapter={custom}>{'```\nplain\n```\n[bold link](https://x.dev)'}</MarkdownBody>
    );
    expect(container.querySelector('.mantine-MarkdownBody-codeHeader')!.textContent).toBe('');
    expect(screen.getByText('bold link').tagName).toBe('B');
    expect(markdownRenders[0].remarkPlugins).toBeUndefined();
  });

  it('passes unstyled to the components it renders', () => {
    const { container } = render(
      <MarkdownBody adapter={adapter} unstyled>
        {source}
      </MarkdownBody>
    );
    const names = ['Typography', 'Anchor', 'Code', 'Text', 'ActionIcon'];

    for (const name of names) {
      const elements = [...container.querySelectorAll(`.mantine-${name}-root`)];
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((cls) => !cls.startsWith('mantine-'))).toEqual([]);
      }
    }
  });

  it('puts the language of a code block under the codeLanguage selector', () => {
    const { container } = render(<MarkdownBody adapter={adapter}>{source}</MarkdownBody>);
    expect(container.querySelector('.mantine-MarkdownBody-codeLanguage')).toHaveTextContent('tsx');
    const language = container.querySelector<HTMLElement>('.mantine-MarkdownBody-codeLanguage')!;
    expect(language.style.color).toBe('');
    expect(language.style.fontFamily).toBe('');
  });
});

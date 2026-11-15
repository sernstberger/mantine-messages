import { render, screen, tests } from '@mantine-tests/core';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { MessagesShell, MessagesShellProps, MessagesShellStylesNames } from './MessagesShell';
import { ThreadPanel } from '../ThreadPanel/ThreadPanel';
import { getRenderError } from '../../../test-utils/get-render-error';
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';
import { itSupportsAttributes } from '../../../test-utils/it-supports-attributes';

const panes = (
  <>
    <MessagesShell.List>Conversations here</MessagesShell.List>
    <MessagesShell.Main>
      <MessagesShell.AsideToggle />
      Thread here
    </MessagesShell.Main>
    <MessagesShell.Aside>Details here</MessagesShell.Aside>
  </>
);

const defaultProps: MessagesShellProps = { children: panes };

const { ResizeObserver: originalObserver } = window;

function measureAs(width: number) {
  window.ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}

    observe() {
      this.callback(
        [
          {
            borderBoxSize: [{ inlineSize: width, blockSize: 600 }],
            contentRect: { x: 0, y: 0, top: 0, left: 0, bottom: 600, right: width },
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    }

    unobserve() {}

    disconnect() {}
  };
}

const aside = () => screen.getByRole('complementary', { hidden: true });

describe('MessagesShell', () => {
  afterEach(() => {
    window.ResizeObserver = originalObserver;
  });

  tests.itSupportsSystemProps<MessagesShellProps, MessagesShellStylesNames>({
    component: MessagesShell,
    props: defaultProps,
    styleProps: true,
    extend: true,
    variant: true,
    size: true,
    classes: true,
    refType: HTMLDivElement,
    displayName: 'MessagesShell',
    stylesApiSelectors: ['root', 'list', 'main', 'aside'],
  });

  describe('collapsed with the aside open', () => {
    beforeEach(() => {
      measureAs(800);
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        callback(0);
        return 0;
      });
    });

    afterEach(() => jest.restoreAllMocks());

    tests.itSupportsSystemProps<MessagesShellProps, MessagesShellStylesNames>({
      component: MessagesShell,
      props: { ...defaultProps, defaultAsideOpened: true },
      styleProps: true,
      extend: true,
      variant: true,
      size: true,
      classes: true,
      refType: HTMLDivElement,
      displayName: 'MessagesShell',
      stylesApiSelectors: ['asideBackdrop', 'asideToggle'],
    });
  });

  itHasStaticVarsResolver({ component: MessagesShell });

  it('sets no theming variables by default', () => {
    const { container } = render(<MessagesShell>{panes}</MessagesShell>);
    const root = container.querySelector<HTMLElement>('.mantine-MessagesShell-root')!;
    for (const name of ['radius', 'list-width', 'aside-width']) {
      expect(root.style.getPropertyValue(`--messages-shell-${name}`)).toBe('');
    }
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <MessagesShell
        vars={() => ({
          root: {
            '--messages-shell-list-width': '20rem',
            '--messages-shell-aside-width': '15rem',
            '--messages-shell-radius': '0',
          },
        })}
      >
        {panes}
      </MessagesShell>
    );
    const root = container.querySelector<HTMLElement>('.mantine-MessagesShell-root')!;
    expect(root.style.getPropertyValue('--messages-shell-list-width')).toBe('20rem');
    expect(root.style.getPropertyValue('--messages-shell-aside-width')).toBe('15rem');
    expect(root.style.getPropertyValue('--messages-shell-radius')).toBe('0');
  });

  itSupportsAttributes({
    component: MessagesShell,
    props: defaultProps,
    name: 'MessagesShell',
    selector: 'list',
  });

  it('lays out labelled regions, with labels of your own', () => {
    render(
      <MessagesShell withBorder radius="lg">
        <MessagesShell.List aria-label="Tickets">Tickets</MessagesShell.List>
        <MessagesShell.Main>Main</MessagesShell.Main>
        <MessagesShell.Aside>Aside</MessagesShell.Aside>
      </MessagesShell>
    );
    expect(screen.getByRole('region', { name: 'Tickets' })).toHaveClass(
      'mantine-MessagesShell-list'
    );
    expect(screen.getByRole('region', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Details' })).toBeVisible();
    const root = screen.getByRole('region', { name: 'Main' }).parentElement!;
    expect(root).toHaveAttribute('data-with-border');
    expect(root).toHaveStyle({ '--messages-shell-radius': 'var(--mantine-radius-lg)' });
    expect(root).not.toHaveAttribute('data-aside-collapsed');
  });

  it('keeps the aside beside Main while there is room, without a toggle', () => {
    measureAs(1200);
    render(<MessagesShell>{panes}</MessagesShell>);
    expect(aside()).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();
  });

  it('collapses the aside below the breakpoint; the toggle and Escape open and close it', async () => {
    measureAs(800);
    const onAsideOpenedChange = jest.fn();
    const onClick = jest.fn();
    const onKeyDown = jest.fn();
    render(
      <MessagesShell onAsideOpenedChange={onAsideOpenedChange}>
        <MessagesShell.Main>
          <MessagesShell.AsideToggle onClick={onClick} />
        </MessagesShell.Main>
        <MessagesShell.Aside onKeyDown={onKeyDown}>
          <button type="button">Inside</button>
        </MessagesShell.Aside>
      </MessagesShell>
    );

    const toggle = await screen.findByRole('button', { name: 'Details' });
    expect(toggle.closest('[data-aside-collapsed]')).toBeInTheDocument();
    expect(aside()).not.toBeVisible();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', aside().id);

    await userEvent.click(toggle);
    expect(onClick).toHaveBeenCalled();
    expect(onAsideOpenedChange).toHaveBeenLastCalledWith(true);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(aside()).toBeVisible();
    expect(aside()).toHaveAttribute('data-overlay');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'a' });
    expect(aside()).toBeVisible();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(onAsideOpenedChange).toHaveBeenLastCalledWith(false);
    expect(aside()).not.toBeVisible();

    await userEvent.click(toggle);
    expect(aside()).toBeVisible();
    await userEvent.click(document.querySelector('.mantine-MessagesShell-asideBackdrop')!);
    expect(aside()).not.toBeVisible();
    expect(document.querySelector('.mantine-MessagesShell-asideBackdrop')).toBeNull();
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(aside()).not.toBeVisible();
  });

  it('closes the open aside on Escape while the focus is on the toggle', async () => {
    measureAs(800);
    const onKeyDown = jest.fn();
    render(
      <MessagesShell>
        <MessagesShell.Main>
          <MessagesShell.AsideToggle onKeyDown={onKeyDown} />
        </MessagesShell.Main>
        <MessagesShell.Aside>Details</MessagesShell.Aside>
      </MessagesShell>
    );
    const toggle = await screen.findByRole('button', { name: 'Details' });

    fireEvent.keyDown(toggle, { key: 'Escape' });
    expect(aside()).not.toBeVisible();

    await userEvent.click(toggle);
    expect(aside()).toBeVisible();
    fireEvent.keyDown(toggle, { key: 'a' });
    expect(aside()).toBeVisible();
    fireEvent.keyDown(toggle, { key: 'Escape' });
    expect(aside()).not.toBeVisible();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(onKeyDown).toHaveBeenCalledTimes(3);
  });

  it('ignores Escape while the aside has room', () => {
    const onAsideOpenedChange = jest.fn();
    render(<MessagesShell onAsideOpenedChange={onAsideOpenedChange}>{panes}</MessagesShell>);
    fireEvent.keyDown(aside(), { key: 'Escape' });
    expect(onAsideOpenedChange).not.toHaveBeenCalled();
  });

  it('can be controlled, take its own toggle label, and never collapse with a breakpoint of 0', async () => {
    measureAs(800);

    function Controlled() {
      const [opened, setOpened] = useState(true);
      return (
        <MessagesShell asideOpened={opened} onAsideOpenedChange={setOpened}>
          <MessagesShell.Main>
            <MessagesShell.AsideToggle className="toggle">Ticket details</MessagesShell.AsideToggle>
          </MessagesShell.Main>
          <MessagesShell.Aside>Details</MessagesShell.Aside>
        </MessagesShell>
      );
    }

    const { unmount } = render(<Controlled />);
    const toggle = await screen.findByRole('button', { name: 'Ticket details' });
    expect(toggle).toHaveClass('toggle', 'mantine-MessagesShell-asideToggle');
    expect(aside()).toBeVisible();
    await userEvent.click(toggle);
    expect(aside()).not.toBeVisible();
    unmount();

    render(<MessagesShell asideBreakpoint={0}>{panes}</MessagesShell>);
    expect(aside()).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();
  });

  it('starts with the collapsed aside open when asked', async () => {
    measureAs(800);
    render(<MessagesShell defaultAsideOpened>{panes}</MessagesShell>);
    expect(await screen.findByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(aside()).toBeVisible();
  });

  it('passes unstyled to the toggle and the backdrop', async () => {
    measureAs(800);
    const { container } = render(
      <MessagesShell unstyled defaultAsideOpened>
        {panes}
      </MessagesShell>
    );
    await screen.findByRole('button', { name: 'Details' });
    for (const name of ['Button', 'Overlay']) {
      const elements = container.querySelectorAll(`.mantine-${name}-root`);
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((cls) => !cls.startsWith('mantine-'))).toEqual([]);
      }
    }
  });

  it('takes the pane names and the toggle text from labels', async () => {
    measureAs(800);
    render(
      <MessagesShell labels={{ list: 'Liste', aside: 'Infos', asideToggle: 'Infos anzeigen' }}>
        {panes}
      </MessagesShell>
    );
    expect(screen.getByRole('region', { name: 'Liste' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Infos', hidden: true })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Infos anzeigen' })).toBeInTheDocument();
  });

  it('moves focus into the open aside and back to the toggle when it closes', async () => {
    measureAs(800);
    render(
      <MessagesShell>
        <MessagesShell.Main>
          <MessagesShell.AsideToggle />
        </MessagesShell.Main>
        <MessagesShell.Aside>
          <button type="button">Inside</button>
        </MessagesShell.Aside>
      </MessagesShell>
    );
    const toggle = await screen.findByRole('button', { name: 'Details' });

    await userEvent.click(toggle);
    expect(aside()).toHaveFocus();
    expect(aside()).toHaveClass('mantine-focus-never');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(aside()).not.toBeVisible();
    expect(toggle).toHaveFocus();

    await userEvent.click(toggle);
    await userEvent.click(document.querySelector('.mantine-MessagesShell-asideBackdrop')!);
    expect(toggle).toHaveFocus();
  });

  it('leaves focus alone when the aside closes while focus is elsewhere', async () => {
    measureAs(800);
    const tree = (opened: boolean) => (
      <>
        <input aria-label="Elsewhere" />
        <MessagesShell asideOpened={opened}>
          <MessagesShell.Main>
            <MessagesShell.AsideToggle />
          </MessagesShell.Main>
          <MessagesShell.Aside>Details</MessagesShell.Aside>
        </MessagesShell>
      </>
    );
    const { rerender } = render(tree(false));
    await screen.findByRole('button', { name: 'Details' });
    rerender(tree(true));
    const input = screen.getByRole('textbox', { name: 'Elsewhere' });
    input.focus();
    rerender(tree(false));
    expect(input).toHaveFocus();
  });

  tests.axe([
    <MessagesShell key="thread">
      <MessagesShell.Main>Main</MessagesShell.Main>
      <MessagesShell.Aside aria-label="Thread pane">
        <ThreadPanel role="region">
          <ThreadPanel.Footer>Footer</ThreadPanel.Footer>
        </ThreadPanel>
      </MessagesShell.Aside>
    </MessagesShell>,
    <MessagesShell key="wide">{panes}</MessagesShell>,
    <MessagesShell key="open" defaultAsideOpened asideBreakpoint={100000}>
      {panes}
    </MessagesShell>,
  ]);

  it('needs the shell around its parts', () => {
    expect(getRenderError(<MessagesShell.List />)).toHaveProperty(
      'message',
      expect.stringMatching(/must be used inside MessagesShell/)
    );
  });
});

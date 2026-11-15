# Theming recipe (phase A lanes A1-A6)

The pattern is ChatThread at `package/src/ChatThread/` (branch `theming/a0-chat-thread`). Read
`ChatThread.tsx`, `ChatThread.module.css` and `ChatThread.test.tsx` first; copy their shape. Your
component's row in `docs/specs/parity/api-shape.md` ("Theming contract") says which props, variables,
selectors and children. Where this file and Mantine's source
(`~/.cache/mantine-review/mantine-9.8.0`, and `node_modules/@mantine/core/esm/components`) disagree,
Mantine's source wins: say so in your report.

## Names

| Thing | Rule | ChatThread example |
| --- | --- | --- |
| Variable | `--<component-kebab>-<name>` | `--chat-thread-radius` |
| Size scale (named sizes) | `--<component-kebab>-<name>-<xs..xl>` on `.root` | `--chat-thread-avatar-size-sm` |
| Type | `<X>CssVariables`, exported from the component file only | `ChatThreadCssVariables` |
| Resolver | `const varsResolver`, `X.varsResolver = varsResolver` | |

Do not edit `package/src/index.ts`. See "docs/styles-api" below for the one docs edit.

## Step 1: props

JSDoc copied from the Mantine prop with the same name (Button, Avatar, Badge), with `@default`.

```tsx
  /** Key of `theme.radius` or any valid CSS value to set `border-radius` of bubbles and quotes, numbers are converted to rem @default 'lg' */
  radius?: MantineRadius;

  /** Key of `theme.colors` or any valid CSS color to set the background of the current user's bubbles @default theme.primaryColor */
  color?: MantineColor;

  /** If set, adjusts the text color of the current user's bubbles based on `color` */
  autoContrast?: boolean;

  /** Width and height of avatars, numbers are converted to rem @default 'sm' */
  avatarSize?: MantineSize | (string & {}) | number;
```

`defaultProps` uses `satisfies` (drop the `!` non-null assertions this makes unnecessary):

```tsx
const defaultProps = {
  groupWindow: 5 * 60 * 1000,
  avatarSize: 'sm',
} satisfies Partial<ChatThreadProps>;
```

What goes in `defaultProps`:
- `radius`, `color`, `variant`: NOT in defaultProps (Mantine Button/Badge). The resolver returns
  `undefined` for them and the CSS fallback carries today's value. Write the default in JSDoc only.
- A value the component passes to a child as a prop (`avatarSize` -> `<Avatar size>`, Composer `size`
  -> `<ActionIcon size>`): IN defaultProps, so the child gets a real value.

Destructure every new prop out of `props` before `...others` (otherwise it lands on the DOM).

## Step 2: types, resolver, useStyles

```tsx
export type ChatThreadCssVariables = {
  root:
    | '--chat-thread-radius'
    | '--chat-thread-own-bg'
    | '--chat-thread-own-color'
    | '--chat-thread-avatar-size'
    | '--chat-thread-row-max-width';
};

export type ChatThreadFactory = Factory<{
  props: ChatThreadProps;
  ref: HTMLDivElement;
  stylesNames: ChatThreadStylesNames;
  vars: ChatThreadCssVariables;
}>;

const varsResolver = createVarsResolver<ChatThreadFactory>(
  (theme, { radius, color, autoContrast, avatarSize }) => {
    const colors = theme.variantColorResolver({
      color: color || theme.primaryColor,
      theme,
      variant: 'filled',
      autoContrast,
    });

    return {
      root: {
        '--chat-thread-radius': radius === undefined ? undefined : getRadius(radius),
        '--chat-thread-own-bg': color ? colors.background : undefined,
        '--chat-thread-own-color': color ? colors.color : undefined,
        '--chat-thread-avatar-size': getSize(avatarSize, 'chat-thread-avatar-size'),
        '--chat-thread-row-max-width': undefined,
      },
    };
  }
);
```

- A "vars only" variable (no prop) is still listed in the resolver as `undefined` (Lightbox does this);
  the type requires every key.
- Colours: `theme.variantColorResolver` with the variant the CSS imitates (`filled` for a solid
  background, `light` for a tinted one, or the `variant` prop when the component has one, as NavLink).
  Set colour variables only when `color` (or `variant`) is passed: `color ? colors.x : undefined`.
- Pass `varsResolver` to `useStyles({ ..., vars, attributes, varsResolver })`.
- After `X.classes = classes;` add `X.varsResolver = varsResolver;`.

## Step 3: CSS

Every new variable is read with today's value as the fallback, so nothing changes when no prop is set:

```css
.root {
  --chat-thread-avatar-size-xs: rem(16px);
  --chat-thread-avatar-size-sm: rem(26px);
  --chat-thread-avatar-size-md: rem(38px);
  --chat-thread-avatar-size-lg: rem(56px);
  --chat-thread-avatar-size-xl: rem(84px);
}

.bubble {
  border-radius: var(--chat-thread-radius, var(--mantine-radius-lg));

  &[data-own] {
    background-color: var(--chat-thread-own-bg, var(--mantine-primary-color-filled));
    color: var(--chat-thread-own-color, var(--mantine-primary-color-contrast));
  }
}

.avatarSpace {
  width: var(--chat-thread-avatar-size, rem(26px));
}
```

## Step 4: selectors and Text props

- New stylesNames: add to the `XStylesNames` union, spread `{...getStyles('name')}` on the element,
  add a class with that element's rules to the CSS module.
- On every Mantine `Text` (or other component) that also gets `getStyles(...)`: remove `c=`, `fw=`,
  `fs=`, `ta=`, `ms=` style props and write them in that selector's CSS class (`c="dimmed"` ->
  `color: var(--mantine-color-dimmed);`, `fw={500}` -> `font-weight: 500;`). They become inline
  styles that beat `classNames`. `size="xs"` stays (it sets a Text variable, not an inline style).

## Step 5: forward unstyled

Every Mantine or package component rendered by the component gets `unstyled={unstyled}` (Text,
Avatar, UnstyledButton, ActionIcon, Menu, Image, and this package's MessageActions, Attachments,
Reactions...). For rows memoised through a shared object (ChatRow), put `unstyled` in the shared
object and its `useMemo` deps.

Exception: `VisuallyHidden` never gets `unstyled` (its class is what hides it; Mantine's FocusTrap
does not forward it either).

## Step 6: tests

Add to `<X>.test.tsx` (imports first):

```tsx
import { itHasStaticVarsResolver } from '../../../test-utils/it-has-static-vars-resolver';

const getRoot = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.mantine-ChatThread-root')!;

  tests.axe([<ChatThread {...defaultProps} />, <ChatThread {...busyProps} />]);

  tests.itSupportsSystemProps<ChatThreadProps, ChatThreadStylesNames>({
    component: ChatThread,
    props: busyProps,            // a fixture that renders EVERY selector
    // ...existing options unchanged...
    stylesApiSelectors: [/* every member of ChatThreadStylesNames */],
  });

  itHasStaticVarsResolver({ component: ChatThread });

  it('sets no theming variables but the avatar size by default', () => {
    const { container } = render(<ChatThread {...defaultProps} />);
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--chat-thread-radius')).toBe('');
    expect(root.style.getPropertyValue('--chat-thread-own-bg')).toBe('');
  });

  it('sets the radius, own colors and avatar size variables from props', () => {
    const { container } = render(
      <ChatThread {...defaultProps} radius="xs" color="teal" avatarSize={40} />
    );
    const root = getRoot(container);
    expect(root.style.getPropertyValue('--chat-thread-radius')).toBe('var(--mantine-radius-xs)');
    expect(root.style.getPropertyValue('--chat-thread-own-bg')).toBe(
      'var(--mantine-color-teal-filled)'
    );
  });

  it('sets variables from vars', () => {
    const { container } = render(
      <ChatThread
        {...defaultProps}
        vars={() => ({ root: { '--chat-thread-row-max-width': '60%' } })}
      />
    );
    expect(getRoot(container).style.getPropertyValue('--chat-thread-row-max-width')).toBe('60%');
  });

  it('passes unstyled to the components it renders', () => {
    const { container } = render(<ChatThread {...busyProps} unstyled />);
    const nested = '.mantine-MessageActions-root, .mantine-Attachments-root, .mantine-Reactions-root';
    const children = ['Avatar', 'Text', 'UnstyledButton', 'MessageActions', 'Attachments', 'Reactions'].map(
      (name) =>
        [...container.querySelectorAll(`.mantine-${name}-root`)].filter(
          (element) => !element.parentElement!.closest(nested)
        )
    );
    for (const elements of children) {
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        expect([...element.classList].filter((name) => !name.startsWith('mantine-'))).toEqual([]);
      }
    }
  });
```

- `varsResolver: true` is NOT an option of the installed `@mantine-tests/core` (2.0.0; 2.1.0 on npm
  lacks it too). Use `itHasStaticVarsResolver` from `test-utils/`, the Mantine repo's own check.
- Read variables with `root.style.getPropertyValue('--x')` (Lightbox's tests do).
- The unstyled test: list the child components YOUR component renders directly; `nested` lists the
  package components among them, so their own children (another lane's job) are skipped. Static
  `mantine-*` classes stay under `unstyled`; module classes (`m_xxxx`, and ours, which jest maps to the
  selector name) must be gone. Check it fails: delete one `unstyled={unstyled}`, run, restore.
- The busy fixture should render every selector (reply quote, unread line, loader, attachments,
  reactions, failed status, a grouped message...), so `stylesApiSelectors` lists all of them.

## docs/styles-api

Adding `vars` to the Factory makes `docs/styles-api/index.ts` fail the docs typecheck (`vars: {}` no
longer fits). The lane does not edit that file; put this block (your variables) in your report so the
lead adds it:

```ts
  vars: {
    root: {
      '--chat-thread-radius': 'Corner radius of bubbles and quotes, from `radius`',
      '--chat-thread-own-bg': 'Background of your bubbles, from `color`',
      '--chat-thread-own-color': 'Text color of your bubbles, from `color` and `autoContrast`',
      '--chat-thread-avatar-size': 'Width and height of avatars, from `avatarSize`',
      '--chat-thread-row-max-width': 'Largest width of a message row, 80% by default',
    },
  },
```

## Pitfalls

1. `getSize('sm', 'avatar-size')` gives `var(--avatar-size-sm)`, and that variable exists only on
   Avatar's own root, not on yours: a named size silently falls back. Define your own scale on `.root`
   (`--x-avatar-size-xs..xl`, values copied from `node_modules/@mantine/core/styles.css`) and call
   `getSize(size, 'x-avatar-size')`. Numbers work either way.
2. `radius` in defaultProps would write `--x-radius` inline on every render; keep it out (step 1).
3. The resolver's return type needs every key of `XCssVariables` (use `undefined`).
4. Run `npx oxfmt -c oxfmt.config.mjs --write <files>`: without `-c` it rewrites to double quotes.
5. Never write the text `ock` followed by `(` (esbuild-jest hands such files to Babel).
6. Jest console output fails tests: no `act` warnings; use `findBy*` for async.
7. Visual check: with no new prop set, screenshots of the stories must be pixel-identical. Relative
   sample times and the unread line's fade make the first shot differ: take before and after shots in
   the same storybook session (swap files with `git checkout <base> -- package/src/X`, shoot, then
   `git checkout HEAD -- package/src/X`) and diff with PIL `ImageChops.difference(...).getbbox()`.

## Done-check per component

| Check | Command or test |
| --- | --- |
| Types | `npm run typecheck` (package part passes; docs part needs the styles-api block above) |
| Tests | `npx jest package/src/<X> --coverage --collectCoverageFrom='package/src/<X>/*.tsx'`: 100% |
| Lint | `npm run lint` and `npm run format:test` |
| Resolver | `X.varsResolver = varsResolver` and `itHasStaticVarsResolver` |
| Defaults | the "no variables by default" test; screenshots identical light and dark |
| Props work | a test per prop reading the root variable; one `vars` test |
| unstyled | the forwarding test, seen failing once without one `unstyled={unstyled}` |
| a11y | `tests.axe` over the default and the busy render |
| Commit | `[mantine-messages] X: ...` ending with the Co-Authored-By line |

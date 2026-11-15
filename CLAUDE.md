# mantine-messages

A Mantine 9 extension (messaging UI kit) built to the standard of Mantine's official extensions, so the
maintainer could list it or take parts upstream. Unpublished until the standards work is done.

## How decisions are made

- Use the `mantine-review` skill (rubrics, official-parity reference at `~/.cache/mantine-review/mantine-9.8.0`)
  and the `mantine-lib-harness` skill. If Mantine core or an official extension has a pattern, follow it without
  asking; ask only when no pattern exists. No shortcuts, no bandaids, no "later" halves of an API.
- The current plan: `docs/specs/2026-11-15-official-parity-plan.md` (decided section at the top).

## Conventions (Mantine's own repo)

- No inline comments that describe logic. JSDoc on public API only. One-line comments only where code cannot say
  why (browser workaround, library quirk).
- Any `console.error`/`console.warn` in a Jest test fails it (`jest-console.cjs`, shared harness template). Fix
  causes (`act`, `findBy*`), never filter the console.
- TypeScript `strict`, `oxlint --deny-warnings`, silent builds.
- Commits: `[mantine-messages] Component: message`.
- Docs site: text before each demo, no markdown pipe tables.
- Components: `factory()` / `genericFactory`, `useProps`, Styles API with `attributes`, `varsResolver` and
  `--<component-kebab>-*` variables, `data-*` modifiers, `[data-x]` not `:where()` for state rules, labels props
  for all text. Compound parts follow Lightbox (`X.Part` statics, `createSafeContext`).
- Never write the text `ock` followed by `(` in any file (esbuild-jest hands such files to Babel).

## Gates

`npm run build && npm run docgen && npm test` (100% coverage), `npm run check:exports`, `npm run docs:build`,
`npm run e2e` (Chromium, Firefox, WebKit), and `node ~/.claude/skills/mantine-lib-harness/scripts/harness-check.mjs`
(all PASS). UI changes: frontend-design critique on screenshots; no visual change unless intended.

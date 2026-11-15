# Browser tests for a Mantine lib (Playwright + Storybook)

Real-browser tests for any library on the Mantine extension template (rollup, Storybook 8 on
Vite, Jest + jsdom). They catch what jsdom cannot: layout shifts, scroll positions, focus, CSS
that fails to load, and errors that show only in a real browser.

| File | Goes to | Changes per repo |
| --- | --- | --- |
| `playwright.config.ts` | repo root | `PORT` only |
| `e2e/support/story.ts` | `e2e/support/` | none |
| `e2e/smoke.spec.ts` | `e2e/` | none |
| `ci-job.yml` | under `jobs:` in `.github/workflows/pull_request.yml` | none |

What you get:

- **Smoke**: every story in Storybook's `index.json`, in light and dark, in Chromium, Firefox and
  WebKit. It renders, Mantine's CSS is on the page, the color scheme is applied, and nothing is
  logged to `console.error` or thrown. Tag a story `no-smoke` to leave it out.
- **Helpers** for your own specs (`e2e/*.spec.ts`), imported from `./support/story`:
  - `test`, `expect`: Playwright's, plus a fixture that fails the test on any console error or
    page error (`test.use({ allowConsole: [/pattern/] })` to allow one)
  - `openStory(page, id, { theme, reducedMotion, args })`: opens `iframe.html?id=…`, waits for
    the story, fonts and color scheme; throws Storybook's error if the story fails
  - `scrollMetrics(locator)`, `scrollTo(locator, top | 'bottom')`: the nearest scrolling
    ancestor (a ScrollArea viewport, say) and its `fromBottom`
  - `expectMantineStyles(page)`, `storyUrl(id, options)`

## Apply

1. Copy the files as in the table. Set `PORT` in `playwright.config.ts` to a port nothing else
   in the repo uses (not the Storybook dev port).
2. Dev dependency: `yarn add -D @playwright/test`, then `npx playwright install`.
3. Root `package.json` scripts:
   ```json
   "storybook:build": "storybook build -o storybook-static --quiet",
   "e2e": "npm run storybook:build && playwright test",
   "e2e:dev": "E2E_DEV=1 playwright test",
   "e2e:ui": "E2E_DEV=1 playwright test --ui"
   ```
4. `jest.config.cjs`: add `'<rootDir>/e2e/'` to `testPathIgnorePatterns` (Jest's `testMatch`
   picks up `*.spec.ts`).
5. `tsconfig.json`: add `"e2e"` and `"playwright.config.ts"` to `include`, so `npm run
   typecheck` covers them. oxlint and oxfmt already cover every `.ts` file.
6. `.gitignore`: `storybook-static`, `playwright-report`, `blob-report`, `test-results`.
   `.stylelintignore`: `storybook-static`, `playwright-report`.
7. Paste `ci-job.yml` into the workflow.

## Run

- `npm run e2e`: builds Storybook, serves `storybook-static/` and runs everything, as CI does.
  After one build, `npx playwright test` reruns without building
  (`--project=chromium`, `-g "split view"` to narrow it).
- `npm run e2e:dev`: against `storybook dev` on `PORT`, started or reused; no build. The smoke
  spec then runs as one test with a step per story.
- `npm run e2e:ui`: Playwright's UI mode, against the dev server.
- On failure: `npx playwright show-report` (traces and screenshots are kept for failed tests).

## Writing specs

- Find things by role and label (`getByRole('button', { name: 'Details' })`), never by CSS class.
- Layout: compare `boundingBox()` before and after. Scrolling: `scrollMetrics`.
- Wait with `expect(...)` and `expect.poll(...)`, not `waitForTimeout`.
- A known bug: `test.fail()` with a comment saying what is wrong and where to fix it, so the test
  flags when it starts passing. `test.fixme()` for one that cannot run yet.
- WebKit does not focus a button on click (as Safari): test focus return from the keyboard
  (`focus()` then `Enter`).

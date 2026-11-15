// Snippet for scripts/harness-check.mjs in the mantine-lib-harness skill: paste it after the
// "storybook: Apps sorted last" check. It uses the script's own read, hash, check, skillDir, fs,
// path and root.

// Storybook: main.ts and preview.tsx are the shared templates (Mantine's, line by line); the
// repo's parts live in repo.tsx and repo-vite.ts
const storybookTemplates = ['main.ts', 'preview.tsx'].map((file) => {
  const template = fs.readFileSync(path.join(skillDir, 'templates/storybook', file), 'utf8');
  const own = read(`.storybook/${file}`);
  return { file, same: own !== null && hash(own) === hash(template) };
});
const differentTemplates = storybookTemplates.filter((t) => !t.same).map((t) => `.storybook/${t.file}`);
check(
  'storybook: shared main.ts and preview.tsx',
  differentTemplates.length === 0,
  differentTemplates.length
    ? `differs: copy templates/storybook/${differentTemplates.map((f) => path.basename(f)).join(', ')} (identical files)`
    : 'identical to templates/storybook/'
);
const repoTsx = read('.storybook/repo.tsx') ?? '';
const repoParts = [
  !fs.existsSync(path.join(root, '.storybook/repo-vite.ts')) && '.storybook/repo-vite.ts (repoStaticDirs, repoViteConfig)',
  !/export const repoTheme\b/.test(repoTsx) && '.storybook/repo.tsx exporting repoTheme',
  !/export const repoDecorators\b/.test(repoTsx) && '.storybook/repo.tsx exporting repoDecorators: Decorator[]',
].filter(Boolean);
check(
  'storybook: repo parts in repo.tsx and repo-vite.ts',
  repoParts.length === 0,
  repoParts.length ? `missing: ${repoParts.join('; ')}` : 'repoTheme, repoDecorators, repoStaticDirs, repoViteConfig'
);

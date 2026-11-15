import fs from 'fs-extra';
import path from 'node:path';
import signale from 'signale';

/**
 * Fails when the root entry of the built package can reach a package other than its required
 * peers. Optional peers (react-markdown, remark-gfm) belong to the subpath entries only: an app
 * that never installs them must still build with `mantine-messages`, and bundlers fail on an
 * import() of a missing package too, so even lazy imports are caught.
 *
 *   tsx scripts/check-root-peers          checks package/dist
 *   tsx scripts/check-root-peers <dir>    checks another build, for example a fake one
 */
const dist = path.resolve(process.argv[2] ?? 'package/dist');
const packageJson = fs.readJsonSync(path.join(process.cwd(), 'package/package.json'));
const meta: Record<string, { optional?: boolean }> = packageJson.peerDependenciesMeta ?? {};
const optional = Object.keys(meta).filter((name) => meta[name].optional);
const required = Object.keys(packageJson.peerDependencies).filter(
  (name) => !optional.includes(name)
);

// `from 'x'`, `import 'x'`, `import('x')`, `require('x')`
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

const packageName = (specifier: string) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

/** Packages reachable from `entry` through its relative imports, with a file that imports each */
function reachablePackages(entry: string) {
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);
    const code = fs.readFileSync(file, 'utf-8');

    for (const [, specifier] of code.matchAll(SPECIFIER)) {
      if (specifier.startsWith('.')) {
        queue.push(path.resolve(path.dirname(file), specifier));
      } else {
        found.set(packageName(specifier), path.relative(dist, file));
      }
    }

    // An import() built from a template string has no plain specifier, but the name still shows
    for (const name of optional) {
      if (code.includes(name)) {
        found.set(name, path.relative(dist, file));
      }
    }
  }

  return found;
}

const errors: string[] = [];

for (const entry of ['esm/index.mjs', 'cjs/index.cjs']) {
  const file = path.join(dist, entry);

  if (!fs.existsSync(file)) {
    errors.push(`${entry} is missing: run npm run build first`);
    continue;
  }

  for (const [name, importer] of reachablePackages(file)) {
    if (!required.includes(name)) {
      errors.push(`${entry} reaches ${name} (imported by ${importer})`);
    }
  }
}

// The check must see an optional peer where it belongs, or it proves nothing
const markdownEntry = path.join(dist, 'esm/markdown.mjs');

if (!fs.existsSync(markdownEntry)) {
  errors.push('esm/markdown.mjs is missing: run npm run build first');
} else if (!reachablePackages(markdownEntry).has('react-markdown')) {
  errors.push('esm/markdown.mjs does not reach react-markdown: the check cannot see imports');
}

if (errors.length > 0) {
  errors.forEach((error) => signale.error(error));
  signale.error(`The root entry may only import ${required.join(', ')}`);
  process.exit(1);
}

signale.success(`The root entry imports only ${required.join(', ')}`);

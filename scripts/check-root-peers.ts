import fs from 'fs-extra';
import path from 'node:path';
import signale from 'signale';

/**
 * Fails when the built entry of the package can reach a package other than its peers. The package
 * has one entry and no optional peers (the markdown engine comes through MarkdownAdapterProvider),
 * so an import of anything else would break an app that installed only the peers.
 *
 *   tsx scripts/check-root-peers          checks package/dist
 *   tsx scripts/check-root-peers <dir>    checks another build, for example a fake one
 */
const dist = path.resolve(process.argv[2] ?? 'package/dist');
const packageJson = fs.readJsonSync(path.join(process.cwd(), 'package/package.json'));
const required = Object.keys(packageJson.peerDependencies);

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

if (errors.length > 0) {
  errors.forEach((error) => signale.error(error));
  signale.error(`The entry may only import ${required.join(', ')}`);
  process.exit(1);
}

signale.success(`The entry imports only ${required.join(', ')}`);

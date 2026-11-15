import fs from 'fs-extra';
import signale from 'signale';
import { $ } from 'zx';
import path from 'node:path';

const typesDir = path.join(process.cwd(), 'package/dist/types');

/** Every `.d.ts` under `dir`, as absolute paths */
function listDeclarations(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listDeclarations(full);
    }
    return entry.name.endsWith('.d.ts') ? [full] : [];
  });
}

/**
 * ESM consumers on moduleResolution node16/nodenext need explicit extensions, so each `.d.mts`
 * points at its sibling `.d.mts` (`./X` becomes `./X.mjs`, `./dir` becomes `./dir/index.mjs`).
 */
function toEsmDeclaration(file: string, source: string) {
  const relative = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/g;
  return source.replace(relative, (_, lead: string, quote: string, spec: string) => {
    const target = path.resolve(path.dirname(file), spec);
    const resolved = fs.existsSync(`${target}.d.ts`)
      ? `${spec}.mjs`
      : `${spec.replace(/\/$/, '')}/index.mjs`;
    return `${lead}${quote}${resolved}${quote}`;
  });
}

async function generateDts() {
  try {
    await $`yarn tsc --project tsconfig.build.json`;
    for (const file of listDeclarations(typesDir)) {
      const esm = file.replace(/\.d\.ts$/, '.d.mts');
      await fs.writeFile(esm, toEsmDeclaration(file, await fs.readFile(file, 'utf-8')));
    }
  } catch (err) {
    signale.error('Failed to generate d.ts files');
    signale.error(err);
    process.exit(1);
  }
}

generateDts();

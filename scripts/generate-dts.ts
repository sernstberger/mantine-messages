/**
 * Mantine lib harness: type declarations that work for every consumer.
 *
 * tsc writes one .d.ts per source file with extensionless relative imports. Copied to .d.mts, those
 * fail for ESM consumers on moduleResolution node16/nodenext (TS2834). So each public entry in
 * package/package.json "exports" is bundled into ONE declaration file with rollup-plugin-dts (no
 * relative imports left), written as both .d.ts (require) and .d.mts (import).
 *
 * Deep imports into dependencies that have no "exports" map (e.g. 'pdfjs-dist/types/src/...') also
 * need a file extension under nodenext ESM; they get `.js` appended (it resolves to the .d.ts beside
 * it).
 *
 * Needs: rollup, rollup-plugin-dts, fs-extra, signale, zx (root devDependencies), and
 * tsconfig.build.json emitting declarations. Run as `tsx scripts/generate-dts` after rollup.
 */
import fs from 'fs-extra';
import { rollup } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import signale from 'signale';
import { $ } from 'zx';
import path from 'node:path';

const root = process.cwd();
const pkgDir = path.join(root, 'package');
const typesDir = path.join(pkgDir, 'dist/types');
const tscDir = path.join(pkgDir, 'dist/.types-tsc');

type ExportTarget = string | { [condition: string]: ExportTarget };

/** Every "types" path in the exports map, e.g. ./dist/types/index.d.ts, ./dist/types/markdown.d.mts */
function collectTypePaths(target: ExportTarget, found = new Set<string>()) {
  if (typeof target === 'string') {
    return found;
  }
  for (const [condition, value] of Object.entries(target)) {
    if (condition === 'types' && typeof value === 'string') {
      found.add(value);
    } else {
      collectTypePaths(value, found);
    }
  }
  return found;
}

/** Packages in node_modules without an "exports" map: deep imports into them need an extension */
function needsExtension(specifier: string) {
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const deep = specifier.slice(name.length + 1);
  if (!deep || /\.(js|mjs|cjs|json)$/.test(deep)) {
    return false;
  }
  try {
    const manifest = fs.readJsonSync(path.join(root, 'node_modules', name, 'package.json'));
    return !manifest.exports;
  } catch {
    return false;
  }
}

function addDeepImportExtensions(code: string) {
  return code.replace(/(from\s+|import\(\s*)'([^'.][^']*)'/g, (match, prefix, specifier) =>
    needsExtension(specifier) ? `${prefix}'${specifier}.js'` : match
  );
}

async function generateDts() {
  try {
    const manifest = await fs.readJson(path.join(pkgDir, 'package.json'));
    // One bundle per entry: dist/types/<entry>.d.ts and .d.mts share a bundle
    const entries = new Set(
      [...collectTypePaths(manifest.exports ?? {})].map((typesPath) =>
        typesPath.replace(/^\.\/dist\/types\//, '').replace(/\.d\.m?ts$/, '')
      )
    );
    if (entries.size === 0) {
      throw new Error('package/package.json "exports" has no "types" entries');
    }

    await fs.remove(tscDir);
    await fs.remove(typesDir);
    await $`yarn tsc --project tsconfig.build.json --declarationDir ${tscDir}`;

    for (const entry of entries) {
      const bundle = await rollup({
        input: path.join(tscDir, `${entry}.d.ts`),
        external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
        plugins: [dts()],
      });
      const { output } = await bundle.generate({ format: 'es' });
      await bundle.close();
      const code = addDeepImportExtensions(output[0].code);
      await fs.outputFile(path.join(typesDir, `${entry}.d.ts`), code);
      await fs.outputFile(path.join(typesDir, `${entry}.d.mts`), code);
    }
    await fs.remove(tscDir);
    signale.success(`Bundled types for ${entries.size} entr${entries.size === 1 ? 'y' : 'ies'}`);
  } catch (err) {
    signale.error('Failed to generate d.ts files');
    signale.error(err);
    process.exit(1);
  }
}

generateDts();

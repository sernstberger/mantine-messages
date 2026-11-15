import path from 'node:path';
import nodeExternals from 'rollup-plugin-node-externals';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';
import banner from 'rollup-plugin-banner2';
import { createGenerateScopedName } from 'hash-css-selector';

const outputDir = path.join(process.cwd(), './package/dist');

// The root entry and the subpath entries; optional peers are imported only below their subpath
const entries = ['index', 'markdown', 'assistant'];

export default {
  input: entries.map((entry) => path.join(process.cwd(), `./package/src/${entry}.ts`)),
  output: [
    {
      format: 'es',
      entryFileNames: '[name].mjs',
      dir: path.join(outputDir, 'esm'),
      preserveModules: true,
      // esbuild runs with sourceMap false, so rollup could only emit empty maps (`sources: []`)
      sourcemap: false,
    },
    {
      format: 'cjs',
      entryFileNames: '[name].cjs',
      dir: path.join(outputDir, 'cjs'),
      preserveModules: true,
      sourcemap: false,
    },
  ],
  plugins: [
    nodeExternals({
      packagePath: path.join(process.cwd(), 'package/package.json'),
    }),
    nodeResolve({ extensions: ['.ts', '.tsx', '.js', '.jsx'] }),
    esbuild({
      sourceMap: false,
      tsconfig: path.resolve(process.cwd(), 'tsconfig.build.json'),
    }),
    replace({ preventAssignment: true }),
    postcss({
      // One CSS file for every entry (no CSS imports an optional peer). A fixed name, because
      // `true` names it after whichever entry chunk comes first
      extract: 'index.css',
      modules: { generateScopedName: createGenerateScopedName('me') },
      minimize: true,
    }),
    banner((chunk) => {
      if (chunk.fileName !== 'index.js' && chunk.fileName !== 'index.mjs') {
        return "'use client';\n";
      }

      return undefined;
    }),
  ],
};

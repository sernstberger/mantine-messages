import fs from 'fs-extra';
import signale from 'signale';
import { $ } from 'zx';
import path from 'node:path';

async function generateDts() {
  try {
    await $`yarn tsc --project tsconfig.build.json`;
    for (const entry of ['index', 'markdown', 'assistant']) {
      await fs.copy(
        path.join(process.cwd(), `package/dist/types/${entry}.d.ts`),
        path.join(process.cwd(), `package/dist/types/${entry}.d.mts`)
      );
    }
  } catch (err) {
    signale.error('Failed to generate d.ts files');
    signale.error(err);
    process.exit(1);
  }
}

generateDts();

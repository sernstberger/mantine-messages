import { generateDeclarations } from 'mantine-docgen-script';
import path from 'path';

const getComponentPath = (componentPath: string) =>
  path.join(process.cwd(), 'package/src', componentPath);

generateDeclarations({
  componentsPaths: [
    getComponentPath('Inbox/Inbox.tsx'),
    getComponentPath('Thread/Thread.tsx'),
    getComponentPath('Composer/Composer.tsx'),
  ],
  tsConfigPath: path.join(process.cwd(), 'tsconfig.json'),
  outputPath: path.join(process.cwd(), 'docs'),
});

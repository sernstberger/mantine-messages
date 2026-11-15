import { createRequire } from 'node:module';
import path from 'path';

const getComponentPath = (componentPath: string) =>
  path.join(process.cwd(), 'package/src', componentPath);

async function main() {
  // react-docgen-typescript names every component of a file after the first factory in it (the
  // displayName literal it reads), then drops the rest as duplicates: Message.tsx documents only
  // MessageAvatar, MessagesShell.tsx only MessagesShellList. mantine-docgen-script does not expose
  // the parser options, so give the parser the export name as the component name, before the
  // script loads it. The script is loaded with require so that it gets the swapped module: an
  // import() of its ESM build reads the original.
  const nodeRequire = createRequire(path.join(process.cwd(), 'package.json'));
  const modulePath = nodeRequire.resolve('react-docgen-typescript');
  const original = nodeRequire(modulePath);

  // The exports of the package are read-only getters, so swap the cached module instead
  nodeRequire.cache[modulePath]!.exports = {
    ...original,
    withCustomConfig: (tsconfigPath: string, parserOptions: object) =>
      original.withCustomConfig(tsconfigPath, {
        ...parserOptions,
        componentNameResolver: (exp: { escapedName: string }) => exp.escapedName,
      }),
  };

  const { generateDeclarations } = nodeRequire('mantine-docgen-script');

  await generateDeclarations({
    componentsPaths: [
      getComponentPath('Inbox/Inbox.tsx'),
      getComponentPath('ChatThread/ChatThread.tsx'),
      getComponentPath('Composer/Composer.tsx'),
      getComponentPath('Message/Message.tsx'),
      getComponentPath('TeamThread/TeamThread.tsx'),
      getComponentPath('ThreadPanel/ThreadPanel.tsx'),
      getComponentPath('MessagesShell/MessagesShell.tsx'),
      getComponentPath('MarkdownBody/MarkdownBody.tsx'),
      getComponentPath('AssistantThread/AssistantThread.tsx'),
      getComponentPath('MessageList/MessageList.tsx'),
      getComponentPath('MessageActions/MessageActions.tsx'),
      getComponentPath('Reactions/Reactions.tsx'),
      getComponentPath('Attachments/Attachments.tsx'),
    ],
    tsConfigPath: path.join(process.cwd(), 'tsconfig.json'),
    outputPath: path.join(process.cwd(), 'docs'),
  });
}

main();

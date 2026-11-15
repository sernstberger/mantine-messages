import { generateDeclarations } from 'mantine-docgen-script';
import path from 'path';

const getComponentPath = (componentPath: string) =>
  path.join(process.cwd(), 'package/src', componentPath);

generateDeclarations({
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

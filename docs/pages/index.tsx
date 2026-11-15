import React from 'react';
import { DocsTabs } from '../components/DocsTabs';
import { PageHeader } from '../components/PageHeader';
import { Shell } from '../components/Shell';
import { PACKAGE_DATA } from '../data';
import docgen from '../docgen.json';
import Docs from '../docs.mdx';
import { STYLES_API_DATA } from '../styles-api';

export default function HomePage() {
  return (
    <Shell>
      <PageHeader data={PACKAGE_DATA} />
      <DocsTabs
        docgen={docgen}
        componentsProps={[
          'Inbox',
          'ChatThread',
          'Composer',
          'TeamThread',
          'ThreadPanel',
          'MessageList',
          'MessageActions',
          'Reactions',
          'Attachments',
          'MarkdownBody',
          'AssistantThread',
        ]}
        componentsStyles={[
          'Inbox',
          'ChatThread',
          'Composer',
          'TeamThread',
          'ThreadPanel',
          'Message',
          'MessageList',
          'MessageActions',
          'Reactions',
          'Attachments',
          'MarkdownBody',
          'AssistantThread',
        ]}
        stylesApiData={STYLES_API_DATA}
      >
        <Docs />
      </DocsTabs>
    </Shell>
  );
}

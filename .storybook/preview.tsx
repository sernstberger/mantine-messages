import '@mantine/core/styles.css';
import { DirectionProvider, MantineProvider, useDirection } from '@mantine/core';
import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import { useGlobals } from '@storybook/preview-api';
import { RepoProviders, repoTheme } from './repo';

/** Alt+Shift+R flips the text direction, as in Mantine's own Storybook */
function DirectionWrapper({ children }: { children: React.ReactNode }) {
  const { toggleDirection } = useDirection();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === 'KeyR') {
        event.preventDefault();
        toggleDirection();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleDirection]);

  return <>{children}</>;
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      // Components alphabetically (each by its export name), showcase apps last. No TypeScript
      // annotations here: Storybook evaluates this function statically
      storySort: (a, b) => {
        const isApp = (item) => item.title.startsWith('Apps/');

        if (isApp(a) !== isApp(b)) {
          return isApp(a) ? 1 : -1;
        }

        if (a.title === b.title) {
          return 0;
        }

        return a.title.localeCompare(b.title, undefined, { numeric: true });
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Mantine color scheme',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (renderStory: any, context: any) => {
      const [{ theme }, updateGlobals] = useGlobals();

      useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
          if (!(event.metaKey || event.ctrlKey) || event.code !== 'KeyJ') {
            return;
          }

          event.preventDefault();
          updateGlobals({ theme: theme === 'dark' ? 'light' : 'dark' });
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [theme, updateGlobals]);

      const scheme = (context.globals.theme || 'light') as 'light' | 'dark';

      // StrictMode mounts, unmounts and mounts again in development (storybook dev, e2e:dev), so
      // effects that do not clean up after themselves show up there
      return (
        <React.StrictMode>
          <DirectionProvider>
            <MantineProvider theme={repoTheme} forceColorScheme={scheme}>
              <RepoProviders>
                <DirectionWrapper>{renderStory()}</DirectionWrapper>
              </RepoProviders>
            </MantineProvider>
          </DirectionProvider>
        </React.StrictMode>
      );
    },
  ],
};

export default preview;

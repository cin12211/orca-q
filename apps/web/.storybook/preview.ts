import { Icon as NuxtIcon } from '#components';
import type { Preview } from '@storybook-vue/nuxt';
import { setup } from '@storybook/vue3';

setup(app => {
  app.component('Icon', NuxtIcon);
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

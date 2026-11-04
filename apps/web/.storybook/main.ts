import type { StorybookConfig } from '@storybook-vue/nuxt';

const config: StorybookConfig = {
  stories: [
    '../app/components/**/*.mdx',
    '../app/components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook-vue/nuxt',
  staticDirs: ['../public'],
};
export default config;

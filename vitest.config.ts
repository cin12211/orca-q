import { defineVitestProject } from '@nuxt/test-utils/config';
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  return {
    test: {
      env: loadEnv('', process.cwd(), ''),
      projects: [
        {
          resolve: {
            alias: {
              '~': path.resolve(__dirname, './'),
              '@': path.resolve(__dirname, './'),
            },
          },
          test: {
            name: 'unit',
            include: ['test/unit/**/*.{test,spec}.ts'],
            environment: 'node',
          },
        },
        {
          test: {
            name: 'e2e',
            include: ['test/e2e/**/*.{test,spec}.ts'],
            environment: 'node',
            env: loadEnv('e2e', process.cwd(), ''),
          },
        },
        await defineVitestProject({
          test: {
            name: 'nuxt',
            include: ['test/nuxt/**/*.{test,spec}.ts'],
            environment: 'nuxt',
            environmentOptions: {
              nuxt: {
                domEnvironment: 'happy-dom',
              },
            },
          },
        }),
      ],
    },
  };
});

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
            name: 'integration',
            include: ['test/api/**/*.{test,spec}.ts'],
            environment: 'node',
            env: loadEnv('e2e', process.cwd(), ''),
            // Each test file starts its own Nuxt server via @nuxt/test-utils setup().
            // Run files one-at-a-time to avoid port / resource contention.
            fileParallelism: false,
            hookTimeout: 240_000,
            testTimeout: 60_000,
          },
        },
        await defineVitestProject({
          test: {
            name: 'nuxt',
            include: ['test/nuxt/**/*.{test,spec}.ts'],
            exclude: ['test/api/**/*.{test,spec}.ts'],
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

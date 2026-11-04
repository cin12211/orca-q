import { defineVitestProject } from '@nuxt/test-utils/config';
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Env files live next to this config (apps/web), whatever the cwd is.
const envDir = __dirname;

// Electron sources live in apps/desktop; unit tests import them as `~/electron/*`.
// This entry must come before the generic `~` alias.
const sharedAliases = [
  {
    find: /^~\/electron\//,
    replacement: `${path.resolve(__dirname, '../desktop/electron')}/`,
  },
  { find: '~', replacement: path.resolve(__dirname, './') },
  { find: '@', replacement: path.resolve(__dirname, './') },
];

export default defineConfig(async () => {
  return {
    test: {
      env: loadEnv('', envDir, ''),
      projects: [
        {
          resolve: {
            alias: sharedAliases,
          },
          test: {
            name: 'unit',
            include: ['test/unit/**/*.{test,spec}.ts'],
            environment: 'node',
          },
        },
        {
          // Executor-level integration tests import app code directly.
          resolve: {
            alias: sharedAliases,
          },
          test: {
            name: 'integration',
            include: ['test/api/**/*.{test,spec}.ts'],
            environment: 'node',
            env: loadEnv('e2e', envDir, ''),
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
            hookTimeout: 30_000,
          },
        }),
      ],
    },
  };
});

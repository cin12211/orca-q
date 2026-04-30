import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-families',
      testMatch: [
        /.*connection\.spec\.ts/,
        /.*connection-form\.spec\.ts/,
        /.*connection-form-live\.spec\.ts/,
        /.*connection-credentials\.spec\.ts/,
        /.*workspace\.spec\.ts/,
        /.*redis-workspace\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun nuxt:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

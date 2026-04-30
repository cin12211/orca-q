import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const testRootDir = './test/playwright';
const workers = Math.max(1, Number(process.env.PLAYWRIGHT_WORKERS || '1'));

function createDbProject(
  name: string,
  relativeDir: string
): NonNullable<PlaywrightTestConfig['projects']>[number] {
  return {
    name,
    testDir: `${testRootDir}/${relativeDir}`,
    use: { ...devices['Desktop Chrome'] },
  };
}

export default defineConfig({
  testDir: testRootDir,
  globalSetup: './test/playwright/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers,
  retries: process.env.CI ? 2 : 1,
  outputDir: 'test-results/playwright/artifacts',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/playwright/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true, // test
    // headless: true process.env.PWDEBUG ? false : !!process.env.CI,
  },
  projects: [
    createDbProject('common', 'common'),
    createDbProject('postgres', 'postgres'),
    createDbProject('mysql', 'mysql'),
    createDbProject('mariadb', 'mariadb'),
    createDbProject('oracle', 'oracle'),
    createDbProject('redis', 'redis'),
    createDbProject('sqlite', 'sqlite'),
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npm run nuxt:dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

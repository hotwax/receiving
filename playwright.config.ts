import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalTimeout: 1000000,
  timeout: 60000,
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    headless: false,
    baseURL: 'https://receiving-uat.hotwax.io',
    trace: 'on-first-retry',
    navigationTimeout: 60000,
    actionTimeout: 60000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        headless: true, // Login happens silently in background
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});

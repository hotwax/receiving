import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { getAllClients } from './config/clients';

const generateProjects = () => {
  const projects: any[] = [];
  let clients = getAllClients();

  // If a specific CLIENT is requested, filter the projects (supports comma-separated list)
  if (process.env.CLIENT) {
    const targets = process.env.CLIENT.toLowerCase().split(',').map((s) => s.trim());
    clients = clients.filter((c) => targets.includes(c.clientId.toLowerCase()));
  }

  for (const config of clients) {
    const clientId = config.clientId;

    // 1. Setup Auth
    projects.push({
      name: `setup-${clientId}`,
      testMatch: /.*\.setup\.ts/,
      use: {
        headless: true,
      },
    });

    // 2. Normal Test Execution
    projects.push({
      name: `chromium-${clientId}`,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, `.auth/${clientId}.user.json`),
        baseURL: config.baseUrl,
      },
      dependencies: [`setup-${clientId}`],
    });
  }

  return projects;
};

export default defineConfig({
  globalTimeout: 1000000,
  timeout: 120000,
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    headless: false,
    trace: 'on-first-retry',
    navigationTimeout: 60000,
    actionTimeout: 60000,
  },
  projects: generateProjects(),
});

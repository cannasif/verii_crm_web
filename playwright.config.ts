import { defineConfig, devices } from '@playwright/test';

const localApiDirectory = process.env.E2E_LOCAL_API_DIR;

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    ...(localApiDirectory ? [{
      command: 'dotnet bin/Debug/net8.0/crm_api.dll --urls http://127.0.0.1:5001',
      cwd: localApiDirectory,
      url: 'http://127.0.0.1:5001/swagger/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
    }] : []),
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: process.env.E2E_API_URL ?? 'http://127.0.0.1:5001',
      },
    },
  ],
});

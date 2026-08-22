import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } },
  use: { colorScheme: 'dark', locale: 'id-ID', timezoneId: 'Asia/Jakarta', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'npm --prefix apps/cab run dev -- --port 4303', url: 'http://127.0.0.1:4303', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm --prefix apps/web run preview -- --port 4304', url: 'http://127.0.0.1:4304', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm --prefix apps/xrp run dev -- --port 4305', url: 'http://127.0.0.1:4305', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm --prefix apps/flow run dev -- --port 4306', url: 'http://127.0.0.1:4306', reuseExistingServer: true, timeout: 120_000 },
  ],
});

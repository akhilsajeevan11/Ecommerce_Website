const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './src/__tests__/accessibility',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
});

import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 4173);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

/**
 * End-to-end tests against the statically generated site, served under the same
 * base path as the GitHub Pages deployment.
 */
export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}/simledger/`,
    trace: 'retain-on-failure',
    viewport: { width: 1400, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 }, launchOptions: executablePath ? { executablePath } : {} },
    },
  ],
  webServer: {
    command: 'npm run e2e:build && node test/e2e/serve.mjs',
    url: `http://localhost:${port}/simledger/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NUXT_APP_BASE_URL: '/simledger/', PORT: String(port) },
  },
});

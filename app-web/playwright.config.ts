import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/lhci-server.mjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
});

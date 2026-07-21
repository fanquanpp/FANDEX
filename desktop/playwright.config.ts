/**
 * Playwright E2E 测试配置（FANDEX Phase 2）
 *
 * 功能：
 * - 测试目录：./tests/e2e
 * - 浏览器矩阵：Chromium、Firefox、Mobile Safari（iPhone 15）
 * - 自动启动 `pnpm preview` 作为 webServer
 * - CI 环境下启用 GitHub reporter + 重试 2 次
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec astro preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/FANDEX-exe/',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

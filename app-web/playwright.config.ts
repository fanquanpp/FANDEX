/**
 * Playwright 冒烟测试配置
 * -----------------------------------------------------------------------------
 * 被测对象：构建产物（dist/），非 dev server——冒烟的意义在于验证"发布出去的东西"。
 * 前置条件：先完成一次全量构建（pnpm build:web，会生成 dist/）。
 * 静态服务：复用 scripts/lhci-server.mjs（剥离 /FANDEX/ base 前缀映射到 dist）。
 *
 * 运行方式：
 *   pnpm --filter @fandex/web test:smoke
 * 首次运行前需安装浏览器：
 *   pnpm --filter @fandex/web exec playwright install chromium
 *
 * 定位：这是 FrontendLab 等岛屿重构（拆分/迁移）前的最小安全网，
 * 只断言核心页面的关键结构与零运行时错误，不覆盖交互细节。
 * -----------------------------------------------------------------------------
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  /** 冒烟用例保持快速失败，不做重试掩盖问题 */
  retries: 0,
  /** 静态服务器单实例 + 产物为静态文件，串行即可且输出稳定 */
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

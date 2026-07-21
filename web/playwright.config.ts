/**
 * Playwright 端到端测试配置
 *
 * 功能概述：
 * 配置 FANDEX-Web 项目的端到端测试环境，包括：
 * - 测试目录：e2e/
 * - 浏览器：仅 chromium（CI 资源友好）
 * - Web Server：自动启动 astro dev 并等待端口就绪
 * - 失败时保留截图与 trace 用于调试
 * - 基础 URL 与 Astro 的 base 路径对齐
 *
 * 使用方式：
 *   npm run test:e2e       # 执行全部 E2E 测试
 *   npm run test:e2e:ui    # 以 UI 模式打开 Playwright Inspector
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Astro dev server 端口（与 astro.config.ts 中 server.port 保持一致）
 */
const DEV_PORT = 3000;
/**
 * Astro 项目 base 路径（与 astro.config.ts 中 base 保持一致）
 */
const BASE_PATH = '/FANDEX-web/';

export default defineConfig({
  // 测试目录
  testDir: './e2e',
  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',
  // 全局超时（单个测试最长运行时间）
  timeout: 30 * 1000,
  // expect 断言超时
  expect: {
    timeout: 5000,
  },
  // 并发执行设置
  fullyParallel: false,
  // 禁止自动 retry（CI 友好）
  retries: process.env.CI ? 1 : 0,
  // 并行工作进程数
  workers: 1,
  // 测试报告器
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // 全局配置
  use: {
    // 基础 URL：dev server + base 路径
    baseURL: `http://localhost:${DEV_PORT}${BASE_PATH}`,
    // 失败时截图
    screenshot: 'only-on-failure',
    // 失败时录制视频
    video: 'retain-on-failure',
    // 失败时保留 trace
    trace: 'retain-on-failure',
    // 视口大小
    viewport: { width: 1280, height: 720 },
    // 用户代理
    userAgent: 'FANDEX-E2E-Test/1.0',
    // 导航超时
    navigationTimeout: 15 * 1000,
    // 时区（Playwright TestOptions 字段名为 timezoneId）
    timezoneId: 'Asia/Shanghai',
    // 语言
    locale: 'zh-CN',
  },
  // 项目配置：仅 chromium
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Web Server 自动启动配置
  // 偏差报备：
  // 1. 原方案使用 `npm run dev` 启动 dev server，但 Astro 7 dev 模式首次启动需同步
  //    2013 篇 Markdown 文档内容，V8 堆内存（即使提升到 8GB）仍耗尽（FATAL ERROR:
  //    Ineffective mark-compacts near heap limit）。
  // 2. 改为 `npm run preview` 启动静态服务器，复用已构建的 dist/ 目录，启动速度极快
  //    且内存占用低。要求执行 E2E 前先完成 `npm run build`（CI 流水线已包含 build 步骤）。
  // 3. preview 默认端口为 4321，需通过 --port 参数显式指定为 3000 以与 baseURL 对齐。
  // 4. timeout 调整为 60 秒（preview 启动通常 <5 秒）。
  webServer: {
    command: 'npm run preview -- --port 3000 --host',
    url: `http://localhost:${DEV_PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

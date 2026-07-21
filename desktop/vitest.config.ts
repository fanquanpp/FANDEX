/**
 * Vitest 配置文件（FANDEX Phase 2）
 *
 * 功能：
 * - 注册 React 插件以支持 TSX 测试用例
 * - 配置路径别名对齐 tsconfig.json（@、@fandex/*）
 * - 设置 happy-dom 作为默认 DOM 环境
 * - 启用 V8 coverage 报告
 *
 * Skill 偏差报备：
 * 原 Phase 2 配置启用了 browser mode（provider: 'playwright'）用于组件级 E2E 测试。
 * Vitest 4.x 起 browser.provider 改为接收 factory 而非字符串，
 * 需额外安装 @vitest/browser-playwright 并 import playwright 工厂。
 * 当前 Phase 12 单元测试均使用 happy-dom 环境（无需浏览器），
 * E2E 测试通过独立 playwright.config.ts 驱动（不依赖 Vitest browser mode），
 * 故禁用 browser mode 以避免引入额外依赖与启动开销。
 * 未来如需组件级浏览器测试，可安装 @vitest/browser-playwright 后重新启用。
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './metadata/modules.json'),
      // Skill 偏差报备：SearchModal.tsx 使用 import(/* @vite-ignore */ '/pagefind/pagefind.js')
      // 加载生产构建产物。Vite 8.x 的 import-analysis 在 vi.mock 注册前就拦截该路径，
      // 导致 vi.mock('/pagefind/pagefind.js') 无效。此处通过 resolve.alias 在解析阶段
      // 重定向到本地 mock 文件，使动态 import 在测试环境返回 mock 模块。
      '/pagefind/pagefind.js': resolve(__dirname, './src/__mocks__/pagefind-mock.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // 排除 E2E 测试目录（由 playwright.config.ts 独立驱动）与其他构建产物
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.*', '**/__tests__/**'],
    },
  },
});

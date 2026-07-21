/**
 * Vitest 测试框架配置
 *
 * 功能概述：
 * 配置 FANDEX 项目的单元测试环境，包括 jsdom DOM 模拟、路径别名映射、
 * v8 覆盖率统计与排除规则。所有路径别名与 tsconfig.json 保持一致，
 * 确保测试代码可使用 @ui/* @services/* @data/* @utils/* @types/* 别名。
 *
 * 设计原则：
 * - 与 tsconfig.json 的 paths 配置保持一致
 * - 排除 src/islands、Astro 文件与 scripts 目录的覆盖率统计
 * - 使用 jsdom 环境支持 DOM API 测试
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/islands/',
        '**/*.astro',
        'scripts/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/**',
        'src/config/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      // astro:content 是 Astro 构建期虚拟模块，在 Vitest 环境无法解析。
      // 映射到测试桩文件，使依赖该模块的 service 可在单测中加载。
      // 测试用例仍可通过 vi.mock('astro:content', ...) 覆盖此默认实现。
      'astro:content': fileURLToPath(new URL('./src/test/astro-content-stub.ts', import.meta.url)),
    },
  },
});

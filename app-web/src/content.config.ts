import { defineCollection } from 'astro:content';
// Astro 7 同时弃用了从 'astro:content' 与 'astro:schema' 导出 z 的方式（ts(6385) 'z' is deprecated）。
// 改为从 'zod' 直接导入（zod 4.x 已作为 astro 的传递依赖存在于 node_modules），
// 并在 package.json 显式声明依赖以锁定版本，避免传递依赖变更导致构建失败。
// 依据：https://docs.astro.build/en/upgrade-guides/v7/ + npm list zod 验证
import { z } from 'zod';
import { glob } from 'astro/loaders';

/**
 * FANDEX 内容 Collection Schema 定义
 *
 * Astro 7 迁移说明：
 * - 原 src/content/config.ts 已迁移至 src/content.config.ts（Astro 6+ 要求）
 * - type: 'content' 已替换为 glob loader（Astro 6+ 移除 legacy content collections）
 * - glob pattern 同时匹配 .md 与 .mdx 文件
 *
 * Phase 2.0 结构化字段（references/etymology/estimatedReadingTime/lastReviewed/reviewer）
 * 已于 2026-09 完成存量清零并整体移除，schema 与 AGENTS.md 的 10 字段白名单保持一致；
 * 新增字段必须同时通过本 schema 与 content-audit 的白名单审计，禁止引入 z.any()。
 */

// ============================================================
// docs Collection
// ============================================================

// （仓库整理后路径变更）：
// 原：app-web/src/content/docs（已删除）
// 新：cnt-content/full（单仓库根目录下的统一内容源）
// base 路径相对于 content.config.ts 所在的 app-web/src/ 目录
const docs = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: '../cnt-content/full',
    // 内容量较大（2000+ 篇）：延迟渲染避免 data store 序列化超限
    // render(entry) 仍会在页面构建时按需渲染，行为不受影响
    deferRender: true,
    generateId: ({ entry }) => entry.replace(/[#\\]/g, '-'),
  }),
  schema: z.object({
    // === 统一后的 10 个标准字段 ===
    // 字段来源分两类（详见 AGENTS.md 与 app-web/scripts/content-sync.mjs）：
    // - 托管字段（sync 自动生成，手写会被校正）：order / module / category /
    //   author / updated —— 构建链与 CI 在 schema 校验前先跑 content-sync，
    //   因此这里保持必填严格校验作为兜底防线；
    // - 手写字段（推荐但均可省略，sync 会补全）：title（缺省取 H1/文件名）、
    //   description、difficulty（缺省 beginner）、related、prerequisites
    //   （死链由 sync 自动清理）。
    // tags / created / readingTime / references / etymology 等历史禁用字段
    // 由 sync 自动删除，任何新增字段必须先过 AGENTS.md 规范评审。
    title: z.string(),
    module: z.string(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    order: z.number().default(0),
    updated: z.coerce.date(),
    author: z.string(),
    description: z.string().optional(),
    related: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
  }),
});

export const collections = { docs };

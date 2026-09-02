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
    // 文档 frontmatter 仅允许以下字段（见根目录 AGENTS.md 文档规范）：
    // order / title / module / category / difficulty / description /
    // author / updated / related / prerequisites
    // 其中 title / module / category / difficulty / author / updated 为必填。
    // 与 content-audit 的字段白名单严格一致：
    // tags / created / readingTime / references / etymology 等历史宽容字段
    // 已随存量清零移除，任何新增字段必须先过 AGENTS.md 规范评审。
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
    // quiz 字段已随 QuizBlock 组件下线移除（存量 0 使用，且为 AGENTS.md 禁止字段）
    // references / etymology / estimatedReadingTime / lastReviewed / reviewer
    // 等 Phase 2.0 结构化字段已完成存量归一化清零（2026-09），一并移除。
  }),
});

export const collections = { docs };

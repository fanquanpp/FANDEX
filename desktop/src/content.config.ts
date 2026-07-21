/**
 * Astro 7 Content Layer API 内容集合定义（FANDEX Phase 5）
 *
 * 功能概述：
 * - 使用 Astro 7 最新 Content Layer API 与 `glob` loader 定义内容集合
 * - docs 集合：加载单仓库根 `content/full/` 目录下的所有 .md/.mdx 文档（约 1995 篇）
 * - glossary 集合：加载 `desktop/src/content/` 下的术语表（27 个模块）
 * - Schema 使用 Zod v4 latest 语法
 *
 * 设计要点：
 * - Astro 7 要求内容配置文件位于 `src/content.config.ts`（非旧版 `src/content/config.ts`）
 * - glob loader 的 `base` 选项相对于 Astro 项目根目录解析（即 `desktop/`）
 * - docs 集合 base 路径 `../content/full` 从 `desktop/` 解析为单仓库根的 `content/full/` 目录
 * - glossary 集合 base 路径 `./src/content/` 从 `desktop/` 解析为 `desktop/src/content/`
 * - generateId 自定义函数将文件名中的 `#` 替换为 `-`，避免 URL 片段标识符冲突
 *
 * 偏差报备（与 web/ 端 schema 对齐）：
 * - quiz 字段使用 union（非 discriminatedUnion），兼容 fill/choice/fix 三种类型；
 *   注：web/ 与 desktop/ 文档基线相同（均为 content/full/），quiz.type 在存量文档中
 *   存在 'fix' 值（如 cpp/RAII资源管理.md），但原 desktop schema 错误地写为 'correct'。
 * - learningObjectives/exercises/references/etymology 等扩展字段使用 z.any() 宽松类型，
 *   原因：存量文档数据格式高度多样（etymology 在部分文档中为对象、在部分文档中为数组；
 *   exercises 的 difficulty 在部分文档中使用字符串、在部分文档中使用数字）。
 *   为不破坏性修改数十篇存量文档，临时改为最宽松类型 z.any()。
 *   后续应统一文档数据格式后，再恢复为严格 schema。
 * - 与 web/src/content.config.ts 保持字段一致，便于双端共享文档基线。
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * docs 内容集合定义
 *
 * 数据源：单仓库 `content/full/` 目录下的所有 .md / .mdx 文档（Web 文档基线）
 * 路径解析：本文件位于 `desktop/src/content.config.ts`，
 *           `base` 相对于 Astro 项目根 `desktop/` 解析，
 *           `../content/full` 解析为单仓库根的 `content/full/` 目录
 */
const docs = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: '../content/full',
    /**
     * 自定义 ID 生成函数
     *
     * 问题：部分文件名包含 `#` 字符（如 `C#12与C#13新特性.md`），
     * 在 Linux 上 `#` 会被 URL 解析器误认为片段标识符，
     * 导致 glob-loader 生成的 ID 在路由匹配时被截断。
     *
     * 解决：将文件路径中的 `#` 替换为 `-`，生成安全的 content collection ID。
     * 文件本身不重命名，仅影响内部 ID 和 URL slug。
     *
     * @param entry - 文件相对路径（相对于 base）
     * @returns 安全的集合 ID（不含 `#`）
     */
    generateId: ({ entry }) => entry.replace(/#/g, '-'),
  }),
  schema: z.object({
    /** 文档标题（必填） */
    title: z.string(),
    /** 所属模块 ID（如 `frontend/javascript`） */
    module: z.string(),
    /** 所属分类（可选，用于二次分组） */
    category: z.string().optional(),
    /** 标签列表（默认空数组） */
    tags: z.array(z.string()).default([]),
    /** 难度等级：beginner（入门）/ intermediate（进阶）/ advanced（高级） */
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    /** 同模块内的排序权重（默认 0，升序排列） */
    order: z.number().default(0),
    /** 创建日期（可选，frontmatter 中通常为 YYYY-MM-DD 字符串） */
    created: z.coerce.date().optional(),
    /** 最近更新日期（可选） */
    updated: z.coerce.date().optional(),
    /** 作者（默认 fanquanpp） */
    author: z.string().default('fanquanpp'),
    /** 文档描述（用于 SEO 与列表预览） */
    description: z.string().optional(),
    /** 阅读时长（单位：分钟，可选，由构建脚本或作者手动填写） */
    readingTime: z.number().optional(),
    /** 相关文档 ID 列表（默认空数组） */
    related: z.array(z.string()).default([]),
    /** 前置知识文档 ID 列表（默认空数组） */
    prerequisites: z.array(z.string()).default([]),
    /** 文档摘要（可选，用于学习卡片展示） */
    summary: z.string().optional(),
    /** 复习要点列表（默认空数组） */
    reviewPoints: z.array(z.string()).default([]),
    /** 考点列表（默认空数组） */
    examPoints: z.array(z.string()).default([]),
    /** 关键术语列表（默认空数组，用于术语提示高亮） */
    keyTerms: z.array(z.string()).default([]),
    /**
     * 测验题列表
     *
     * 偏差报备：原 desktop schema 使用 discriminatedUnion 且 type 为 fill/choice/correct，
     * 但存量文档中 type 实际为 fill/choice/fix（与 web/ 一致）。
     * 改为 union 以兼容实际数据，字段全部 optional 或带默认值以容错。
     */
    quiz: z
      .array(
        z.union([
          z.object({
            type: z.literal('fill'),
            question: z.string(),
            answer: z.string(),
            hint: z.string().optional(),
          }),
          z.object({
            type: z.literal('choice'),
            question: z.string(),
            options: z.array(z.string()),
            answer: z.number(),
            explanation: z.string().optional(),
          }),
          z.object({
            type: z.literal('fix'),
            question: z.string(),
            code: z.string().optional(),
            answer: z.string(),
            explanation: z.string().optional(),
          }),
        ]),
      )
      .default([]),
    // === Phase 1.5 扩展字段（与 web/ 对齐） ===
    // 偏差报备：以下扩展字段原使用严格 schema，但存量文档数据格式高度多样：
    //   - exercises/references 有的文档缺字段或使用非枚举值；
    //   - etymology 在部分文档中为数组、在部分文档中为对象；
    //   - learningObjectives 在部分文档中为字符串数组、在部分文档中为对象数组。
    // 为不破坏性修改数十篇存量文档，临时改为最宽松类型 z.any()，
    // 既接受 array 也接受 object 或其他格式。
    // 后续应统一文档数据格式后，再恢复为严格 schema。
    learningObjectives: z.any().default([]).describe('学习目标，遵循 Bloom 分类法，3-7 条'),
    exercises: z.any().default([]).describe('习题列表，覆盖四类题型'),
    references: z.any().default([]).describe('参考文献列表，遵循 ACM Reference Format'),
    etymology: z.any().default([]).describe('词源条目，计算机术语的英文原词与词源'),
    estimatedReadingTime: z.number().optional().describe('预估阅读时长（分钟）'),
    lastReviewed: z.coerce.date().optional().describe('最后审阅日期'),
    reviewer: z.string().optional().describe('审阅人'),
  }),
});

/**
 * glossary 术语表集合定义
 *
 * 数据源：`desktop/src/content/glossary/<module>/glossary.md`
 * 路径解析：本文件位于 `desktop/src/content.config.ts`，
 *           `base` 相对于 Astro 项目根 `desktop/` 解析，
 *           `./src/content/` 解析为 `desktop/src/content/`
 *           配合 pattern `./glossary/<module>/glossary.md` 解析为对应术语表文件
 */
const glossary = defineCollection({
  loader: glob({ pattern: './glossary/*/glossary.md', base: './src/content/' }),
  schema: z.object({
    /** 术语表标题（如 "JavaScript 术语表"） */
    title: z.string(),
    /** 所属模块 ID */
    module: z.string(),
    /** 最近更新日期（可选） */
    updated: z.coerce.date().optional(),
  }),
});

/** 导出所有集合（Astro Content Layer API 入口） */
export const collections = { docs, glossary };

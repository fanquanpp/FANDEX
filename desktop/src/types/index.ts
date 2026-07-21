/**
 * 共享类型定义汇总导出
 *
 * 功能概述：
 * - 集中导出 FANDEX Web 端所有 React 岛屿组件共用的类型定义
 * - 提供统一的类型导入入口（`@/types`），避免分散引用导致的循环依赖风险
 * - 包含 Quiz、Annotation、SearchResult、Cheatsheet、Module 等核心类型
 *
 * 设计要点：
 * - 通过 re-export 模式聚合各子模块类型，保持单一职责
 * - 仅导出 type 与 interface，不引入运行时逻辑
 * - 与 Phase 3-5 创建的 lib/ store/ hooks/ 中的类型保持一致（直接 re-export）
 */

export type { ProgressStatus } from '@/lib/constants';
// 模块定义类型（来自 Phase 5 modules.ts）
export type {
  Module,
  ModuleCategory,
  ModuleProgress as ModuleProgressInfo,
} from '@/lib/modules';
// 阅读进度相关类型（来自 Phase 5 progress / Phase 4 progress-store）
export type {
  ModuleProgress as ModuleProgressStat,
  ModuleProgress as ModuleProgressFromStore,
  OverallProgress,
} from '@/lib/progress';
// 批注类型（来自 Phase 4 annotations-store，re-export 便于组件直接消费）
export type {
  Annotation,
  AnnotationColor,
  AnnotationNoteFormat,
  NewAnnotationInput,
} from '@/lib/store/annotations-store';
// 搜索结果类型（来自 Phase 4 search-store）
export type { SearchResult } from '@/lib/store/search-store';
// 测验题目类型（Task 18.1）
export type {
  Quiz,
  QuizAttempt,
  QuizChoice,
  QuizCorrect,
  QuizFill,
} from '@/types/quiz';

/**
 * 速查表（Cheatsheet）相关类型
 *
 * 用于 CheatSheet 岛屿组件（apps/web/src/islands/CheatSheet.tsx）的 props 类型定义。
 * 与 apps/web/src/data/cheatsheets/*.json 文件结构对齐。
 */
export interface CheatsheetItem {
  /** 语法/代码片段 */
  syntax: string;
  /** 语法说明 */
  description: string;
  /** 示例代码（可选） */
  example?: string;
}

/** 速查表章节 */
export interface CheatsheetSection {
  /** 章节标题 */
  title: string;
  /** 章节下的条目列表 */
  items: CheatsheetItem[];
}

/** 速查表数据结构（与 data/cheatsheets/*.json 顶层结构一致） */
export interface CheatsheetData {
  /** 速查表标识（如 'javascript'） */
  name: string;
  /** 速查表标题 */
  title: string;
  /** 章节列表 */
  sections: CheatsheetSection[];
}

/**
 * Giscus 评论组件 Props 类型
 *
 * 用于 Comments 岛屿组件（apps/web/src/islands/Comments.tsx），
 * 与 @giscus/react 的 props 对齐（仅声明使用到的子集）。
 */
export interface CommentsProps {
  /** GitHub 仓库（owner/repo 形式，如 'fanquanpp/FANDEX'） */
  repo: `${string}/${string}`;
  /** Giscus 仓库 ID */
  repoId: string;
  /** Discussion 分类名 */
  category: string;
  /** Giscus 分类 ID */
  categoryId: string;
  /** 页面映射方式（默认 'pathname'） */
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  /** 主题（默认 'light'，会随主题切换动态变化） */
  theme?: 'light' | 'dark' | 'dark_dimmed' | 'transparent_dark' | 'preferred_color_scheme';
  /** 语言（默认 'zh-CN'） */
  lang?: string;
  /** 加载方式（默认 'lazy'） */
  loading?: 'lazy' | 'eager';
}

/**
 * Hero Canvas 粒子配置（内部类型，供 HeroCanvas 组件使用）
 */
export interface HeroCanvasConfig {
  /** 粒子数量上限（默认 80） */
  maxParticles?: number;
  /** 粒子连接最大距离（默认 120px） */
  linkDistance?: number;
  /** 鼠标交互半径（默认 150px） */
  mouseRadius?: number;
  /** 是否启用鼠标交互（默认 true） */
  interactive?: boolean;
}

/**
 * 安装提示组件状态
 */
export type InstallPromptState = 'idle' | 'available' | 'dismissed' | 'installed';

/**
 * 代码运行器组件 Props 类型
 */
export interface CodeRunnerProps {
  /** 待执行的代码字符串 */
  code: string;
  /** 代码语言 */
  language?: 'js' | 'ts';
  /** 是否默认展开结果区（默认 false） */
  defaultExpanded?: boolean;
}

/**
 * Mermaid 懒加载组件 Props 类型
 */
export interface MermaidLazyProps {
  /** Mermaid 图表源码 */
  chart: string;
  /** 图表唯一 ID（用于 SVG 选择器） */
  id: string;
}

export default {};

/**
 * 元数据实时读取函数集合
 * -----------------------------------------------------------------------------
 * 所有函数从 shd-shared/metadata/ 读取数据，三端共享。
 *
 * 设计原则：
 * - 零硬编码：所有元数据均从 shd-shared/metadata/ 实时读取
 * - SSR 安全：所有函数可在 Astro SSG 构建期安全调用
 * - 异常容错：所有函数通过 try-catch 包裹，异常时返回安全默认值
 * - 类型严格：无 any，所有类型显式声明
 *
 * 数据源：
 * - modules.json              → 模块列表（含分类、图标、描述）
 * - roadmap/phases.json       → 路线图阶段（含模块顺序与依赖箭头）
 * - roadmap/career-paths.json → 职业路径（含步骤序列）
 * - glossary/{module}.json    → 各模块术语表
 *
 * 实现说明：
 * - 函数均为同步实现（readFileSync），适用于 Astro SSG 构建期同步调用，
 *   无需 await；JSDoc 示例均按同步用法书写。
 * - tags 标签索引由各端页面运行时从 astro:content 的 docs 集合聚合，
 *   不在本模块提供读取函数（避免与运行时聚合机制重复）。
 * - cheatsheets 速查表由各端页面通过 import.meta.glob 直接加载 JSON，
 *   速查表类型由各端 types/index.ts 独立定义（英文 key），
 *   不在本模块提供读取函数与类型（避免中文 key 类型与各端英文 key 类型重复）。
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// 路径解析：定位 shd-shared/metadata/ 目录
// ============================================================

/** 本文件所在目录（shd-shared/utl-utils/） */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** 元数据根目录（shd-shared/metadata/） */
const metadataDir = resolve(__dirname, '..', 'metadata');

// ============================================================
// 类型定义
// ============================================================

/** 模块定义 */
export interface Module {
  /** 模块 ID（如 'cpp'、'algorithm'） */
  id: string;
  /** 模块显示名称 */
  title: string;
  /** 模块图标（缩写文本） */
  icon: string;
  /** 模块描述 */
  description: string;
  /** 所属分类列表 */
  categories: string[];
}

/** 模块元数据完整结构 */
export interface ModuleMetadata {
  /** 数据版本 */
  version: string;
  /** 分类标签映射 */
  categoryLabels: Record<string, string>;
  /** 分类颜色映射 */
  categoryColors: Record<string, string>;
  /** 分类排序 */
  categoryOrder: string[];
  /** 模块列表 */
  modules: Module[];
}

/** 路线图阶段项 */
export interface RoadmapItem {
  /** 模块 ID */
  id: string;
  /** 箭头方向（'right' | 'down' | null） */
  arrow: string | null;
}

/** 路线图阶段 */
export interface RoadmapPhase {
  /** 阶段标识（如 'Phase 0'） */
  phase: string;
  /** 阶段标签 */
  label: string;
  /** 阶段描述 */
  desc: string;
  /** 阶段颜色 */
  color: string;
  /** 阶段包含的模块项 */
  items: RoadmapItem[];
}

/** 职业路径步骤 */
export interface CareerPathStep {
  /** 模块 ID */
  id: string;
  /** 步骤标签 */
  label: string;
}

/** 职业路径 */
export interface CareerPath {
  /** 路径名称 */
  label: string;
  /** 路径颜色 */
  color: string;
  /** 路径步骤 */
  steps: CareerPathStep[];
}

/** 术语条目 */
export interface GlossaryTerm {
  /** 术语名称 */
  name: string;
  /** 术语定义 */
  definition: string;
  /** 来源页面 slug */
  slug: string;
}

/** 模块术语表 */
export interface Glossary {
  /** 模块 ID */
  moduleId: string;
  /** 术语列表 */
  terms: GlossaryTerm[];
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 读取 JSON 文件并解析
 * @param filePath - JSON 文件绝对路径
 * @returns 解析后的 JSON 数据；异常时返回 null
 */
function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 读取模块列表元数据
 *
 * 从 shd-shared/metadata/modules.json 读取全部模块定义，包含分类标签、
 * 颜色映射与排序信息。三端首页模块卡片网格均通过此函数获取数据。
 *
 * 同步函数，适用于 Astro SSG 构建期调用，无需 await。
 *
 * @returns 模块元数据完整结构；异常时返回 null
 *
 * @example
 * ```typescript
 * const metadata = getModules();
 * if (metadata) {
 *   for (const mod of metadata.modules) {
 *     console.log(mod.id, mod.title);
 *   }
 * }
 * ```
 */
export function getModules(): ModuleMetadata | null {
  try {
    return readJsonFile<ModuleMetadata>(resolve(metadataDir, 'modules.json'));
  } catch {
    return null;
  }
}

/**
 * 读取路线图阶段数据
 *
 * 从 shd-shared/metadata/roadmap/phases.json 读取学习路线图的阶段划分，
 * 每个阶段包含模块项与依赖箭头方向。三端 roadmap 页面均通过此函数获取数据。
 *
 * 同步函数，适用于 Astro SSG 构建期调用，无需 await。
 *
 * @returns 路线图阶段数组；异常时返回空数组
 *
 * @example
 * ```typescript
 * const phases = getRoadmap();
 * for (const phase of phases) {
 *   console.log(phase.phase, phase.label);
 * }
 * ```
 */
export function getRoadmap(): RoadmapPhase[] {
  try {
    const data = readJsonFile<RoadmapPhase[]>(resolve(metadataDir, 'roadmap', 'phases.json'));
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * 读取职业路径数据
 *
 * 从 shd-shared/metadata/roadmap/career-paths.json 读取职业学习路径，
 * 每条路径包含步骤序列（模块 ID 与标签）。
 *
 * 同步函数，适用于 Astro SSG 构建期调用，无需 await。
 *
 * @returns 职业路径数组；异常时返回空数组
 *
 * @example
 * ```typescript
 * const paths = getCareerPaths();
 * for (const path of paths) {
 *   console.log(path.label, path.steps.length);
 * }
 * ```
 */
export function getCareerPaths(): CareerPath[] {
  try {
    const data = readJsonFile<CareerPath[]>(resolve(metadataDir, 'roadmap', 'career-paths.json'));
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * 读取指定模块的术语表
 *
 * 从 shd-shared/metadata/glossary/{module}.json 读取指定模块的术语表，
 * 包含术语名称、定义与来源 slug。
 *
 * 同步函数，适用于 Astro SSG 构建期调用，无需 await。
 *
 * @param module - 模块 ID（如 'cpp'、'algorithm'）
 * @returns 模块术语表；模块不存在或异常时返回 null
 *
 * @example
 * ```typescript
 * const glossary = getGlossary('cpp');
 * if (glossary) {
 *   for (const term of glossary.terms) {
 *     console.log(term.name, term.definition);
 *   }
 * }
 * ```
 */
export function getGlossary(module: string): Glossary | null {
  try {
    if (!module) return null;
    return readJsonFile<Glossary>(resolve(metadataDir, 'glossary', `${module}.json`));
  } catch {
    return null;
  }
}

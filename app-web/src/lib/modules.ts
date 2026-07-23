/**
 * FANDEX 模块元数据 — Web 端访问层
 *
 * 设计说明：
 * 本文件从 @fandex/utils/modules 共享包导入模块与分类定义，
 * 保证 web/desktop/android 三端使用统一的元数据源，避免数据漂移。
 * 共享层通过 JSON import 直接读取 shd-shared/metadata/modules.json，
 * 兼容 Vite（Astro SSG）与 Metro（Expo/RN）两种构建环境。
 *
 * 本文件职责：
 * - 从共享包 re-export 通用类型、数据与查询函数
 * - 补充 web 端专属工具函数（docSlug 等）
 *
 * 分类体系（v4.0.0）：
 * - tools      工具链
 * - frontend   前端技术
 * - backend    后端技术
 * - database   数据库
 * - cs         计算机科学
 * - math       数学
 * - cloud      云与基础设施
 * - ai         人工智能
 */

// 从共享包导入通用类型、数据与查询函数（三端统一数据源）
export {
  modules,
  categoryLabels,
  categoryColors,
  categoryOrder,
  modulePrerequisites,
  getModule,
  getModulesByCategory,
  getPrimaryCategory,
  getPrerequisites,
} from '@fandex/utils/modules';

// 从共享包 re-export 类型定义，供 web 端业务代码使用
export type { Module, ModuleMetadata } from '@fandex/utils/modules';

// ============================================================
// Web 端专属工具函数
// ============================================================

/**
 * 从 content collection id 中提取 slug（文件名去除 .md 后缀）
 *
 * web 端 Astro content collection 使用 `模块/文档` 格式的 ID，
 * 此函数提取最后一段作为文档 slug，用于路由匹配与进度追踪。
 *
 * @param id - content collection 条目 ID（如 `cpp/introduction`）
 * @returns 文档 slug（如 `introduction`）
 *
 * @example
 * ```typescript
 * const slug = docSlug('cpp/introduction'); // "introduction"
 * ```
 */
export function docSlug(id: string): string {
  return (id.split('/').pop() || id).replace(/\.(md|mdx)$/, '');
}

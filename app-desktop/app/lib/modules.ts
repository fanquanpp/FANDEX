/**
 * FANDEX 模块元数据 — Desktop 端访问层（Expo/React Native）
 *
 * 设计说明：
 * 本文件从 @fandex/utils/modules 共享包导入模块与分类定义，
 * 保证 web/desktop/android 三端使用统一的元数据源，避免数据漂移。
 * 共享层通过 JSON import 直接读取 shd-shared/metadata/modules.json，
 * 兼容 Vite（Astro SSG）与 Metro（Expo/RN）两种构建环境。
 *
 * 本文件职责：
 * - 从共享包 re-export 通用类型、数据与查询函数
 * - 补充 desktop 端专属工具函数（未来扩展：Tauri 进度持久化等）
 *
 * 架构说明：
 * - Metro bundler 通过 watchFolders 配置（见 metro.config.js）解析 workspace 包
 * - @fandex/utils 包通过 pnpm workspace 链接，exports 字段映射 ./modules → ./modules.ts
 * - JSON import 由 Metro 原生支持，构建期将 JSON 内联为 JS 对象
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

// 从共享包 re-export 类型定义，供 desktop 端组件使用
export type { Module, ModuleMetadata } from '@fandex/utils/modules';

// ============================================================
// Desktop 端专属工具函数（未来扩展点）
// ============================================================

/**
 * 从模块 ID 生成路由路径
 *
 * Expo Router 使用文件系统路由，模块详情页位于 app/[module]/index.tsx，
 * 此函数将模块 ID 转换为可被 router.push() 使用的路径。
 *
 * @param moduleId - 模块 ID（如 javascript、react）
 * @returns 路由路径（如 /module/javascript）
 *
 * @example
 * ```typescript
 * router.push(toModuleRoute('javascript'));
 * ```
 */
export function toModuleRoute(moduleId: string): string {
  return `/module/${moduleId}`;
}

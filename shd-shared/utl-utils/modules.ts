/**
 * 模块元数据共享访问层（三端统一数据源）
 * -----------------------------------------------------------------------------
 * 通过直接 JSON import 从 shd-shared/metadata/modules.json 读取模块与分类定义，
 * 保证 web/desktop/android 三端使用统一的元数据源，避免数据漂移。
 *
 * 设计原则：
 * - 零硬编码：所有模块数据从共享元数据 JSON 实时读取
 * - 跨平台兼容：使用 ES module JSON import，同时兼容 Vite（Astro SSG）与 Metro（Expo/RN）
 * - 类型严格：无 any，所有类型显式声明，与 modules.json 结构对齐
 * - 冻结导出：数据导出使用 Object.freeze 防止运行时篡改
 *
 * 与 metadata.ts 的区别：
 * - metadata.ts 使用 readFileSync（Node.js 专属），仅适用于 Astro SSG 构建期同步调用
 * - modules.ts 使用 JSON import（ES 标准），同时适用于 Vite 构建期与 Metro 运行期
 * - 三端客户端（islands/RN 组件）统一使用 modules.ts；服务端 SSR 可使用 metadata.ts
 *
 * 数据源：shd-shared/metadata/modules.json
 * 路径解析：本文件位于 shd-shared/utl-utils/，JSON 在 shd-shared/metadata/
 */

// 从共享元数据 JSON 直接导入（Vite 与 Metro 均原生支持 JSON 解析）
import modulesData from '../metadata/modules.json';

// ============================================================
// 类型定义
// ============================================================

/**
 * 模块定义结构
 * 对应 modules.json 中 modules 数组的单条记录
 */
export interface Module {
  /** 模块唯一标识（如 javascript、react） */
  readonly id: string;
  /** 模块显示名称 */
  readonly title: string;
  /** 模块图标文本（用于侧边栏/首页色块） */
  readonly icon: string;
  /** 模块简短描述 */
  readonly description: string;
  /** 所属分类列表（一个模块可属于多个分类） */
  readonly categories: readonly string[];
}

/**
 * 模块元数据完整结构
 * 对应 modules.json 顶层结构
 */
export interface ModuleMetadata {
  /** 数据版本号 */
  readonly version: string;
  /** 分类标签映射（分类 ID → 中文显示名） */
  readonly categoryLabels: Record<string, string>;
  /** 分类颜色映射（分类 ID → 十六进制颜色值） */
  readonly categoryColors: Record<string, string>;
  /** 分类显示顺序（控制首页与侧边栏中分类的排列次序） */
  readonly categoryOrder: readonly string[];
  /** 模块列表 */
  readonly modules: readonly Module[];
  /** 模块前置依赖关系（模块 ID → 前置模块 ID 数组） */
  readonly modulePrerequisites: Record<string, readonly string[]>;
}

// ============================================================
// 数据导出
// ============================================================

/**
 * 类型化的模块元数据（编译期类型检查）
 */
const typedData = modulesData as ModuleMetadata;

/**
 * 全部模块定义数组（冻结，防止运行时篡改）
 */
export const modules: readonly Module[] = Object.freeze(
  typedData.modules.map((m) => ({ ...m, categories: [...m.categories] })),
);

/**
 * 分类标签映射（分类 ID → 中文显示名）
 */
export const categoryLabels: Record<string, string> = { ...typedData.categoryLabels };

/**
 * 分类颜色映射（分类 ID → 十六进制颜色值）
 * 每个分类一种统一颜色，高饱和清晰可辨
 */
export const categoryColors: Record<string, string> = { ...typedData.categoryColors };

/**
 * 分类显示顺序
 * 控制首页与侧边栏中分类的排列次序
 */
export const categoryOrder: string[] = [...typedData.categoryOrder];

/**
 * 模块前置依赖关系
 * 键为模块 ID，值为该模块依赖的前置模块 ID 列表
 */
export const modulePrerequisites: Record<string, readonly string[]> = {
  ...typedData.modulePrerequisites,
};

// ============================================================
// 查询函数
// ============================================================

/**
 * 根据模块 ID 获取模块定义
 *
 * @param id - 模块标识符（如 javascript、react）
 * @returns 模块对象，未找到返回 undefined
 *
 * @example
 * ```typescript
 * const jsModule = getModule('javascript');
 * if (jsModule) {
 *   console.log(jsModule.title); // "JavaScript"
 * }
 * ```
 */
export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

/**
 * 获取指定分类下的所有模块
 *
 * @param category - 分类标识符
 * @returns 属于该分类的模块数组
 *
 * @example
 * ```typescript
 * const frontendModules = getModulesByCategory('frontend');
 * ```
 */
export function getModulesByCategory(category: string): Module[] {
  return modules.filter((m) => m.categories.includes(category));
}

/**
 * 获取模块的主分类（categories 数组的第一个元素）
 *
 * @param mod - 模块对象
 * @returns 主分类 ID，若无分类返回空字符串
 */
export function getPrimaryCategory(mod: Module): string {
  return mod.categories[0] ?? '';
}

/**
 * 获取模块的前置依赖模块列表
 *
 * @param moduleId - 模块 ID
 * @returns 前置模块数组（若模块不存在或无前置依赖，返回空数组）
 */
export function getPrerequisites(moduleId: string): Module[] {
  const prereqIds = modulePrerequisites[moduleId] ?? [];
  return prereqIds
    .map((id) => getModule(id))
    .filter((m): m is Module => m !== undefined);
}

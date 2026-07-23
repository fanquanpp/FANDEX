/**
 * 模块注册表与查询工具（Phase 5）
 *
 * 功能概述：
 * - 从 `metadata/modules.json` 加载 51 个学习模块与 8 个分类的定义
 * - 提供模块查询 API：按 ID、按 slug、按分类、按前置依赖、按被依赖关系
 * - 提供模块进度查询 API（从 progress-store 读取实时进度数据）
 * - 类型严格：Module / ModuleCategory 接口与 JSON 数据结构一致
 *
 * 数据源：
 * - `shd-shared/metadata/modules.json`：模块定义、分类标签、分类颜色、分类顺序、前置依赖关系
 * - 路径计算：本文件位于 `app-desktop/src/lib/modules.ts`，
 *           通过 Vite `@modules` 别名导入（见 astro.config.ts），实际指向 `shd-shared/metadata/modules.json`
 *
 * 模块结构：
 * - id：模块唯一标识（如 `frontend/javascript`）
 * - title：模块中文标题
 * - icon：模块图标（短文本，用于侧边栏与卡片）
 * - description：模块描述
 * - categories：所属分类数组（一个模块可属于多个分类）
 *
 * 分类参考：
 * - tools：工具链
 * - frontend：前端技术
 * - backend：后端技术
 * - database：数据库
 * - cs：计算机科学
 * - math：数学
 * - cloud：云与基础设施
 * - ai：人工智能
 *
 * 使用示例：
 *   import { MODULES, getModule, getModulesByCategory } from '@/lib/modules';
 *   const jsModule = getModule('frontend/javascript');
 *   const frontendModules = getModulesByCategory('frontend');
 */

// 通过 Vite resolve.alias 配置的 @modules 别名导入（见 astro.config.ts）
// 在 TS 类型检查阶段回退到相对路径（tsconfig paths 已配置 @modules 别名）
import moduleData from '@modules';
import type { ProgressStatus } from '@/lib/constants';

/**
 * 模块类型定义
 *
 * 字段含义：
 * - id：模块唯一标识（路径形式，如 `frontend/javascript`）
 * - name：模块中文显示名（与 JSON 中的 title 对应）
 * - category：主分类 ID（categories 数组的第一个元素）
 * - description：模块描述
 * - icon：图标标识（短文本）
 * - color：分类颜色（继承自主分类）
 * - order：分类内排序（按 moduleData 中数组顺序）
 * - prerequisites：前置模块 ID 数组
 * - docsCount：模块下文档数量（运行时动态填充，默认 0）
 * - difficulty：模块难度（默认 beginner，可由上层覆盖）
 */
export interface Module {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly order: number;
  readonly prerequisites: readonly string[];
  readonly docsCount: number;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * 模块分类类型定义
 *
 * 字段含义：
 * - id：分类 ID（如 `frontend`）
 * - name：分类中文名（来自 categoryLabels）
 * - icon：分类图标（暂用首字母，未来可扩展）
 * - color：分类颜色（来自 categoryColors）
 * - modules：该分类下的所有模块（已按 order 排序）
 */
export interface ModuleCategory {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly modules: readonly Module[];
}

/** 模块进度统计类型 */
export interface ModuleProgress {
  /** 模块下文档总数 */
  total: number;
  /** 已读文档数 */
  read: number;
  /** 阅读中文档数 */
  reading: number;
  /** 未读文档数 */
  unread: number;
  /** 已读百分比（0-100） */
  percent: number;
}

/**
 * 原始 JSON 数据结构（用于类型推断）
 */
interface ModuleRawData {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly description: string;
  readonly categories: readonly string[];
}

interface ModuleDataShape {
  readonly version: string;
  readonly categoryLabels: Record<string, string>;
  readonly categoryColors: Record<string, string>;
  readonly categoryOrder: readonly string[];
  readonly modules: readonly ModuleRawData[];
  readonly modulePrerequisites: Record<string, readonly string[]>;
}

/** 类型化的模块数据（编译期类型检查） */
const typedModuleData = moduleData as ModuleDataShape;

/** 模块前置依赖映射 */
const prerequisiteMap: Record<string, readonly string[]> = {
  ...typedModuleData.modulePrerequisites,
};

/**
 * 构建 Module 实例数组
 *
 * 实现说明：
 * - 遍历原始模块数据，转换为严格类型的 Module 接口
 * - 主分类取 categories 数组的第一个元素
 * - 颜色继承自主分类的颜色映射
 * - order 取数组索引（保持 JSON 中的顺序）
 * - prerequisites 来自 modulePrerequisites 映射，缺失时为空数组
 * - docsCount 默认为 0，由运行时动态更新
 * - difficulty 默认为 'beginner'，可由上层覆盖
 */
const MODULES: readonly Module[] = typedModuleData.modules.map((m, index) => {
  const category = m.categories[0] ?? 'tools';
  const color = typedModuleData.categoryColors[category] ?? '#4f5bd5';
  return {
    id: m.id,
    name: m.title,
    category,
    description: m.description,
    icon: m.icon,
    color,
    order: index,
    prerequisites: prerequisiteMap[m.id] ?? [],
    docsCount: 0,
    difficulty: 'beginner' as const,
  };
});

/**
 * 构建 ModuleCategory 数组
 *
 * 实现说明：
 * - 按 categoryOrder 顺序遍历分类
 * - 每个分类下的模块按 order 排序
 * - 分类名来自 categoryLabels，颜色来自 categoryColors
 */
const MODULE_CATEGORIES: readonly ModuleCategory[] = typedModuleData.categoryOrder.map(
  (categoryId) => {
    const name = typedModuleData.categoryLabels[categoryId] ?? categoryId;
    const color = typedModuleData.categoryColors[categoryId] ?? '#4f5bd5';
    const modules = MODULES.filter((m) => m.category === categoryId).sort(
      (a, b) => a.order - b.order,
    );
    return {
      id: categoryId,
      name,
      icon: name.charAt(0),
      color,
      modules,
    };
  },
);

/**
 * 根据 ID 查找模块
 *
 * @param id - 模块唯一标识（如 `frontend/javascript`）
 * @returns 匹配的模块对象，未找到返回 undefined
 */
export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

/**
 * 根据 slug 查找模块（slug 为 ID 的最后一段）
 *
 * 例如 slug `javascript` 可匹配 `frontend/javascript`。
 * 若多个模块具有相同 slug，返回第一个匹配项。
 *
 * @param slug - 模块 slug
 * @returns 匹配的模块对象，未找到返回 undefined
 */
export function getModuleBySlug(slug: string): Module | undefined {
  return MODULES.find((m) => {
    const parts = m.id.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart === slug;
  });
}

/**
 * 根据分类 ID 获取该分类下的所有模块
 *
 * @param categoryId - 分类 ID（如 `frontend`）
 * @returns 该分类下的模块数组（按 order 排序）
 */
export function getModulesByCategory(categoryId: string): readonly Module[] {
  return MODULES.filter((m) => m.category === categoryId).sort((a, b) => a.order - b.order);
}

/**
 * 获取指定模块的前置依赖模块列表
 *
 * @param moduleId - 模块 ID
 * @returns 前置模块数组（若模块不存在或无前置依赖，返回空数组）
 */
export function getPrerequisites(moduleId: string): readonly Module[] {
  const module = getModule(moduleId);
  if (!module) return [];
  return module.prerequisites
    .map((id) => getModule(id))
    .filter((m): m is Module => m !== undefined);
}

/**
 * 获取依赖指定模块的模块列表（反向依赖）
 *
 * @param moduleId - 模块 ID
 * @returns 依赖该模块的所有模块数组
 */
export function getDependents(moduleId: string): readonly Module[] {
  return MODULES.filter((m) => m.prerequisites.includes(moduleId));
}

/**
 * 获取模块的阅读进度统计
 *
 * 实现说明：
 * - 动态导入 progress-store 避免循环依赖
 * - 通过模块下所有文档 ID 列表计算进度
 * - 若未提供 allDocIds，仅返回基于已有数据的统计
 *
 * @param moduleId - 模块 ID
 * @param allDocIds - 该模块下所有文档 ID 列表（可选）
 * @returns 模块进度统计
 */
export function getModuleProgress(
  _moduleId: string,
  allDocIds?: readonly string[],
): ModuleProgress {
  // 动态导入避免循环依赖（progress-store 可能反向引用 modules）
  // 使用同步降级方案：从 localStorage 读取，避免 store 初始化时序问题
  const docIds = allDocIds ?? [];
  let read = 0;
  let reading = 0;
  let unread = 0;

  if (typeof window !== 'undefined' && docIds.length > 0) {
    try {
      const raw = localStorage.getItem('fandex-progress');
      if (raw) {
        // progress-store 的 localStorage 数据结构为 { state: { progress: {...}, ... }, version: N }
        // 也可能为 partialize 后的 { progress: {...}, lastReadAt: {...}, recentDocs: [...] }
        const parsed = JSON.parse(raw) as {
          state?: { progress?: Record<string, ProgressStatus> };
          progress?: Record<string, ProgressStatus>;
        };
        const progressMap = parsed.state?.progress ?? parsed.progress ?? {};

        for (const docId of docIds) {
          const status = progressMap[docId] ?? 'unread';
          if (status === 'read') read++;
          else if (status === 'reading') reading++;
          else unread++;
        }
      } else {
        unread = docIds.length;
      }
    } catch {
      unread = docIds.length;
    }
  } else if (docIds.length > 0) {
    unread = docIds.length;
  }

  const total = docIds.length;
  const percent = total === 0 ? 0 : Math.round((read / total) * 100);

  return { total, read, reading, unread, percent };
}

export { MODULE_CATEGORIES, MODULES, typedModuleData as MODULE_DATA };

export default {
  MODULES,
  MODULE_CATEGORIES,
  getModule,
  getModuleBySlug,
  getModulesByCategory,
  getPrerequisites,
  getDependents,
  getModuleProgress,
};

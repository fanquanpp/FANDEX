/**
 * 模块服务模块
 * 封装模块元数据的查询逻辑
 *
 * 设计说明：
 * - 静态元数据定义（modules 数组、categoryLabels、categoryColors 等）保留在 @/lib/modules
 * - 本模块仅负责提供查询接口，不持有数据副本
 * - modules.ts 中的查询函数保持不变，本模块对其进行包装以统一 Service 层入口
 */
import {
  modules,
  categoryLabels,
  categoryColors,
  categoryOrder,
  modulePrerequisites,
  getModule as getModuleData,
  getModulesByCategory as getModulesByCategoryData,
  getPrimaryCategory as getPrimaryCategoryData,
  type Module,
} from '@/lib/modules';

/** 分类信息 */
interface CategoryInfo {
  /** 分类 ID */
  id: string;
  /** 分类显示名称 */
  label: string;
  /** 分类主题色 */
  color: string;
}

/**
 * 获取所有模块（只读数组）
 * @returns 全部模块元数据数组
 */
export function getAllModules(): readonly Module[] {
  return modules;
}

/**
 * 获取指定模块信息
 * @param id - 模块 ID
 * @returns 模块对象；未找到时返回 undefined
 */
export function getModule(id: string): Module | undefined {
  return getModuleData(id);
}

/**
 * 按分类获取模块列表
 * @param categoryId - 分类 ID
 * @returns 属于该分类的模块数组
 */
export function getModulesByCategory(categoryId: string): Module[] {
  return getModulesByCategoryData(categoryId);
}

/**
 * 获取模块的主分类（categories 数组的第一个元素）
 * @param moduleId - 模块 ID
 * @returns 主分类 ID；模块不存在时返回 undefined
 */
export function getPrimaryCategory(moduleId: string): string | undefined {
  const mod = getModuleData(moduleId);
  if (!mod) return undefined;
  return getPrimaryCategoryData(mod);
}

/**
 * 获取模块的前置依赖模块列表
 * @param moduleId - 模块 ID
 * @returns 前置模块 ID 数组；无记录时返回空数组
 */
export function getModulePrerequisites(moduleId: string): string[] {
  return modulePrerequisites[moduleId] || [];
}

/**
 * 获取所有分类信息（按 categoryOrder 顺序）
 * @returns 分类信息数组，每项包含 id、label、color
 */
export function getCategories(): CategoryInfo[] {
  return categoryOrder.map((id) => ({
    id,
    label: categoryLabels[id] || id,
    color: categoryColors[id] || '#666666',
  }));
}

export type { Module, CategoryInfo };

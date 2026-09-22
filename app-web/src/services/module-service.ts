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

interface CategoryInfo {
  id: string;
  label: string;
  color: string;
}

export function getAllModules(): readonly Module[] {
  return modules;
}

export function getModule(id: string): Module | undefined {
  return getModuleData(id);
}

export function getModulesByCategory(categoryId: string): Module[] {
  return getModulesByCategoryData(categoryId);
}

export function getPrimaryCategory(moduleId: string): string | undefined {
  const mod = getModuleData(moduleId);
  if (!mod) return undefined;
  return getPrimaryCategoryData(mod);
}

export function getModulePrerequisites(moduleId: string): string[] {
  return [...(modulePrerequisites[moduleId] ?? [])];
}

export function getCategories(): CategoryInfo[] {
  return categoryOrder.map((id) => ({
    id,
    label: categoryLabels[id] || id,
    color: categoryColors[id] || '#666666',
  }));
}

export type { Module, CategoryInfo };

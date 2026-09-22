
import modulesData from '../metadata/modules.json';

export type OfficialDocType = 'docs' | 'api' | 'spec';

export interface OfficialDoc {
  readonly label: string;
  readonly url: string;
  readonly type: OfficialDocType;
}

export interface Module {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly updatePriority?: boolean;
  readonly updateNote?: string;
  readonly officialDocs?: readonly OfficialDoc[];
}

export interface ModuleMetadata {
  readonly version: string;
  readonly categoryLabels: Record<string, string>;
  readonly categoryColors: Record<string, string>;
  readonly categoryOrder: readonly string[];
  readonly modules: readonly Module[];
  readonly modulePrerequisites: Record<string, readonly string[]>;
}

const typedData = modulesData as ModuleMetadata;

export const modules: readonly Module[] = Object.freeze(
  typedData.modules.map((m) => ({ ...m, categories: [...m.categories] })),
);

export const categoryLabels: Record<string, string> = { ...typedData.categoryLabels };

export const categoryColors: Record<string, string> = { ...typedData.categoryColors };

export const categoryOrder: string[] = [...typedData.categoryOrder];

export const modulePrerequisites: Record<string, readonly string[]> = {
  ...typedData.modulePrerequisites,
};

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

export function getModulesByCategory(category: string): Module[] {
  return modules.filter((m) => m.categories.includes(category));
}

export function getPrimaryCategory(mod: Module): string {
  return mod.categories[0] ?? '';
}

export function getPrerequisites(moduleId: string): Module[] {
  const prereqIds = modulePrerequisites[moduleId] ?? [];
  return prereqIds
    .map((id) => getModule(id))
    .filter((m): m is Module => m !== undefined);
}

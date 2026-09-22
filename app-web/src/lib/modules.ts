
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

export type { Module, ModuleMetadata, OfficialDoc, OfficialDocType } from '@fandex/utils/modules';

export function docSlug(id: string): string {
  return (id.split('/').pop() || id).replace(/\.(md|mdx)$/, '');
}

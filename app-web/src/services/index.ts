
export {
  getAllDocs,
  getDocsByModule,
  getDocBySlug,
  getDocNavigation,
  getDocStats,
  getDocsIndex,
  computeReadingTime,
  docSlug,
} from './doc-service';
export type { DocEntry, DocNavigation, DocStats, DocIndexItem } from './doc-service';

export {
  getAllModules,
  getModule,
  getModulesByCategory,
  getPrimaryCategory,
  getModulePrerequisites,
  getCategories,
} from './module-service';
export type { Module, CategoryInfo } from './module-service';

export { getSyntaxIndex, getSyntaxLanguages, getSyntaxStats } from './syntax-service';
export type { SyntaxLanguage, SyntaxStats } from './syntax-service';

export {
  recordVital,
  getVitals,
  getVitalsSummary,
  clearVitals,
  exportVitalsJSON,
} from './observability-service';
export type {
  VitalName,
  VitalRating,
  VitalRecord,
  VitalPercentiles,
  VitalsSummary,
} from './observability-service';

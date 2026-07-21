/**
 * Service 层统一入口
 * UI 层（pages/components/islands）禁止直接导入 services 内部模块，必须从此文件导入
 * Data 层（getCollection 等）仅允许在 services 内部调用
 */

// ── 文档服务 ──
export {
  getAllDocs,
  getDocsByModule,
  getDocBySlug,
  getDocNavigation,
  getDocStats,
  getDocsByCategory,
  getRelatedDocs,
  computeReadingTime,
  docSlug,
} from './doc-service';
export type { DocEntry, DocNavigation, DocStats } from './doc-service';

// ── 模块服务 ──
export {
  getAllModules,
  getModule,
  getModulesByCategory,
  getPrimaryCategory,
  getModulePrerequisites,
  getCategories,
} from './module-service';
export type { Module, CategoryInfo } from './module-service';

// ── 标签服务 ──
export { getAllTags, getDocsByTag, getTagStats } from './tag-service';
export type { TagWithCount, TagStats } from './tag-service';

// ── 术语表服务 ──
export { getGlossaryByModule, getAllGlossaryTerms, searchGlossary } from './glossary-service';
export type { GlossaryEntry } from './glossary-service';

// ── 进度服务 ──
// 统一管理 localStorage 缓存 + IndexedDB 主存储的双存储进度服务
// 同步 API（getProgress/setProgress 等）保持向后兼容；异步 API（getProgressStats 等）用于统计与推荐
export {
  getProgress,
  setProgress,
  getAllProgress,
  removeProgress,
  subscribeProgress,
  clearAllProgress,
  getProgressStats,
  exportProgress,
  importProgress,
  getRecommendedNext,
  syncFromIndexedDB,
  clearProgressCache,
} from './progress-service';
export type {
  DocStatus,
  ReadingProgress,
  ProgressMap,
  ProgressChangeCallback,
  ProgressRecord,
  ProgressStatus,
  ProgressStats,
  ModuleProgressItem,
  RecommendedDoc,
} from './progress-service';

// ── 学习路径服务 ──
// 基于静态 learning-paths.json 提供职业学习路径查询、进度聚合与推荐
export { getAllPaths, getPath, getPathProgress, getRecommendedPath } from './learning-path-service';
export type {
  LearningPath,
  PathModule,
  PathProgress,
  PathModuleProgress,
  ModulePriority,
} from './learning-path-service';

// ── 代码运行服务 ──
// 多语言代码沙箱（JS/TS/Python/C/C++），Web Worker 隔离 + 5 秒超时保护
export { runCode, disposeCodeRunner } from './code-runner-service';
export type { RunRequest, RunResult, CodeLanguage } from './code-runner-service';

// ── 知识地图服务 ──
// 构建 module/doc/global 三种范围的知识地图数据，输出 Mermaid 可渲染的结构化数据
export { getGlobalMap, getModuleMap, getDocMap, toMermaidGraph } from './knowledge-map-service';
export type {
  MapNode,
  MapEdge,
  MapNodeType,
  MapEdgeType,
  MapDifficulty,
  KnowledgeMap,
} from './knowledge-map-service';

// ── 可观测性服务 ──
// Web Vitals 性能指标采集（LCP/INP/CLS/TTFB/FCP），持久化到 localStorage
// 提供 p50/p75/p95 分位数统计与 JSON 导出，供 PerformanceMonitor 与外部监控使用
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

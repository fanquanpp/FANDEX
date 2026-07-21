/**
 * 进度服务模块
 * 统一管理文档阅读进度的读取、写入、删除和订阅
 * 合并原 @/lib/progress 与 @/lib/store 的进度管理职责
 *
 * 双存储架构：
 * - localStorage 缓存（快速读取）：lib/progress.ts 维护的简化版 ReadingProgress
 * - IndexedDB 主存储（持久化）：ProgressRepository 维护的完整版 ProgressRecord
 * - 写入时双写（同步 lib/progress + 异步 ProgressRepository.upsert）
 * - 读取时优先 localStorage（同步快速），异步聚合 IndexedDB 提供统计能力
 * - syncFromIndexedDB() 用于从 IndexedDB 恢复 localStorage 缓存
 *
 * SSR 安全说明：
 * - Astro 构建阶段（SSR）localStorage 和 document 均不可用
 * - 所有函数在 SSR 阶段安全返回空数据或空操作，不抛异常
 * - 客户端阶段使用 localStorage 持久化，并通过自定义事件广播变更
 *
 * 事件机制：
 * - fan dex-progress-change：进度变更时派发（与现有 ProgressToggle 组件兼容）
 * - progress-sync：跨标签页同步事件
 * - storage：原生跨标签页存储事件
 */
import {
  getAllProgress as getAllProgressRaw,
  getProgress as getProgressRaw,
  setProgress as setProgressRaw,
  type DocStatus,
  type ReadingProgress,
  type ProgressMap,
} from '@/lib/progress';
import {
  getProgressRepository,
  type ProgressRecord,
  type ProgressStatus,
} from '@/data/storage/progress-repository';
import { getAllModules } from './module-service';

/** 进度变更回调函数类型 */
type ProgressChangeCallback = (progress: ProgressMap) => void;

/** localStorage 存储键名（与 @/lib/progress 保持一致） */
const STORAGE_KEY = 'fandex-progress';
/** localStorage 缓存键名（用于 ProgressRecord 数组） */
const RECORDS_CACHE_KEY = 'fandex-progress-records-cache';

/** 进度变更自定义事件名称（与现有组件保持一致） */
const PROGRESS_CHANGE_EVENT = 'fandex-progress-change';
/** 跨标签页同步事件名称 */
const PROGRESS_SYNC_EVENT = 'progress-sync';

// ── 类型定义 ──────────────────────────────────────────────────────────────

/**
 * 进度统计（用于 ProgressDashboard 展示）
 * 聚合自 lib/progress 的 ProgressMap 与 ProgressRepository 的 ProgressRecord
 */
export interface ProgressStats {
  /** 总文档数（基于 ProgressMap 与 ProgressRecord 的并集） */
  totalDocs: number;
  /** 已完成文档数 */
  completed: number;
  /** 进行中文档数（reading 状态） */
  inProgress: number;
  /** 未开始文档数（not-started 或无记录） */
  notStarted: number;
  /** 已收藏文档数 */
  bookmarked: number;
  /** 总阅读时长（秒） */
  totalReadingTime: number;
  /** 连续打卡天数 */
  streakDays: number;
  /** 最后活跃日期（YYYY-MM-DD） */
  lastActiveDate?: string;
  /** 各模块进度明细 */
  moduleProgress: ModuleProgressItem[];
}

/** 模块进度明细项 */
export interface ModuleProgressItem {
  /** 模块 ID */
  moduleId: string;
  /** 模块内文档总数（基于进度记录） */
  total: number;
  /** 已完成文档数 */
  completed: number;
  /** 进行中文档数 */
  inProgress: number;
}

/** 推荐文档 */
export interface RecommendedDoc {
  /** 文档唯一标识（moduleId/slug） */
  docSlug: string;
  /** 所属模块 ID */
  moduleId: string;
  /** 文档标题（若无法获取则使用 slug） */
  title: string;
  /** 推荐理由 */
  reason: string;
}

// ── 同步 API（兼容现有组件，保持向后兼容） ──────────────────────────────────

/**
 * 获取所有文档的阅读进度（基于 localStorage 缓存，同步快速读取）
 * SSR 阶段安全返回空对象；异常时回退为空对象
 * @returns 进度映射表（docId → ReadingProgress）
 */
export function getAllProgress(): ProgressMap {
  try {
    return getAllProgressRaw();
  } catch {
    return {};
  }
}

/**
 * 获取单个文档的阅读进度
 * @param docId - 文档唯一标识（格式为 "moduleId/slug"）
 * @returns 阅读进度对象；无记录或异常时返回 null
 */
export function getProgress(docId: string): ReadingProgress | null {
  try {
    return getProgressRaw(docId);
  } catch {
    return null;
  }
}

/**
 * 设置文档的阅读进度
 * 写入 localStorage 后派发变更事件，并异步同步至 IndexedDB
 * @param docId - 文档唯一标识
 * @param status - 阅读状态（unread | reading | done）
 * @param scrollPos - 滚动位置（可选，默认 0）
 */
export function setProgress(docId: string, status: DocStatus, scrollPos = 0): void {
  try {
    setProgressRaw(docId, status, scrollPos);
    notifyProgressChange();
    // 异步双写到 IndexedDB（不阻塞 UI）
    void syncToIndexedDB(docId, status, scrollPos);
  } catch {
    // SSR 或存储异常时静默忽略，不影响渲染
  }
}

/**
 * 删除指定文档的阅读进度
 * @param docId - 文档唯一标识
 */
export function removeProgress(docId: string): void {
  try {
    const all = getAllProgressRaw();
    delete all[docId];
    saveProgressMap(all);
    notifyProgressChange();
  } catch {
    // 异常时静默忽略
  }
}

/**
 * 清空所有文档的阅读进度
 */
export function clearAllProgress(): void {
  try {
    saveProgressMap({});
    notifyProgressChange();
    // 异步清空 IndexedDB
    void getProgressRepository().clearAll();
  } catch {
    // 异常时静默忽略
  }
}

/**
 * 订阅进度变更事件
 * 用于 Vue 岛屿组件响应式更新：当进度变化时回调被触发
 * 监听三类事件：fandex-progress-change（本组件变更）、progress-sync（跨标签页）、storage（原生跨标签页）
 * @param callback - 进度变更回调函数，接收最新的进度映射表
 * @returns 取消订阅函数（调用后移除所有监听）
 */
export function subscribeProgress(callback: ProgressChangeCallback): () => void {
  // SSR 阶段无 document，返回空操作取消函数
  if (typeof document === 'undefined') {
    return () => {};
  }
  const handler = () => callback(getAllProgress());
  document.addEventListener(PROGRESS_CHANGE_EVENT, handler);
  document.addEventListener(PROGRESS_SYNC_EVENT, handler);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handler);
  }
  return () => {
    document.removeEventListener(PROGRESS_CHANGE_EVENT, handler);
    document.removeEventListener(PROGRESS_SYNC_EVENT, handler);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handler);
    }
  };
}

// ── 异步 API（基于 IndexedDB，用于统计与推荐） ──────────────────────────────

/**
 * 获取进度统计聚合数据
 * 聚合 lib/progress（ProgressMap）与 ProgressRepository（ProgressRecord[]）的数据
 * @returns 进度统计对象；异常时返回零值
 */
export async function getProgressStats(): Promise<ProgressStats> {
  try {
    const repo = getProgressRepository();
    const [records, legacyMap] = await Promise.all([
      repo.getAll(),
      Promise.resolve(getAllProgressRaw()),
    ]);

    // 合并两个数据源：以 docSlug 为 key，ProgressRecord 优先（含更丰富字段）
    const mergedMap = new Map<string, ProgressRecord>();
    // 先填充 legacy 数据
    for (const [docId, legacy] of Object.entries(legacyMap)) {
      const moduleId = extractModuleId(docId);
      const status = mapLegacyStatus(legacy.status);
      const baseRecord: ProgressRecord = {
        docSlug: docId,
        moduleId,
        status,
        progress: legacy.status === 'done' ? 100 : legacy.status === 'reading' ? 50 : 0,
        readingTime: 0,
        bookmarked: false,
        lastReadAt: legacy.lastRead,
      };
      // 仅在完成状态下添加 completedAt（exactOptionalPropertyTypes 不允许显式 undefined）
      if (legacy.status === 'done') {
        baseRecord.completedAt = legacy.lastRead;
      }
      mergedMap.set(docId, baseRecord);
    }
    // ProgressRecord 覆盖（更丰富字段优先）
    for (const record of records) {
      mergedMap.set(record.docSlug, record);
    }

    const allRecords = Array.from(mergedMap.values());
    const completed = allRecords.filter((r) => r.status === 'completed').length;
    const inProgress = allRecords.filter((r) => r.status === 'reading').length;
    const notStarted = allRecords.filter((r) => r.status === 'not-started').length;
    const bookmarked = allRecords.filter((r) => r.bookmarked).length;
    const totalReadingTime = allRecords.reduce((sum, r) => sum + r.readingTime, 0);

    // 计算打卡天数（基于 lastReadAt/completedAt 时间戳）
    const activeDates = new Set<string>();
    for (const r of allRecords) {
      if (r.lastReadAt) {
        activeDates.add(toDateString(r.lastReadAt));
      }
      if (r.completedAt) {
        activeDates.add(toDateString(r.completedAt));
      }
    }
    const streakDays = computeStreakDays(activeDates);
    const lastActiveDate = computeLastActiveDate(activeDates);

    // 按模块聚合进度
    const moduleProgressMap = new Map<string, ModuleProgressItem>();
    for (const record of allRecords) {
      const item = moduleProgressMap.get(record.moduleId) ?? {
        moduleId: record.moduleId,
        total: 0,
        completed: 0,
        inProgress: 0,
      };
      item.total += 1;
      if (record.status === 'completed') item.completed += 1;
      else if (record.status === 'reading') item.inProgress += 1;
      moduleProgressMap.set(record.moduleId, item);
    }

    // 补齐所有模块（即使无进度记录也显示）
    const allModules = getAllModules();
    for (const mod of allModules) {
      if (!moduleProgressMap.has(mod.id)) {
        moduleProgressMap.set(mod.id, {
          moduleId: mod.id,
          total: 0,
          completed: 0,
          inProgress: 0,
        });
      }
    }

    // 仅在存在活跃日期时添加 lastActiveDate（exactOptionalPropertyTypes 不允许显式 undefined）
    const stats: ProgressStats = {
      totalDocs: allRecords.length,
      completed,
      inProgress,
      notStarted,
      bookmarked,
      totalReadingTime,
      streakDays,
      moduleProgress: Array.from(moduleProgressMap.values()),
    };
    if (lastActiveDate !== undefined) {
      stats.lastActiveDate = lastActiveDate;
    }
    return stats;
  } catch {
    return {
      totalDocs: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      bookmarked: 0,
      totalReadingTime: 0,
      streakDays: 0,
      moduleProgress: [],
    };
  }
}

/**
 * 导出全部进度数据为 JSON 字符串
 * 同时包含 IndexedDB 中的 ProgressRecord 与 localStorage 中的 ProgressMap
 * @returns JSON 字符串
 */
export async function exportProgress(): Promise<string> {
  try {
    const repo = getProgressRepository();
    const [records, legacyMap] = await Promise.all([
      repo.getAll(),
      Promise.resolve(getAllProgressRaw()),
    ]);
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records,
        legacyProgress: legacyMap,
      },
      null,
      2
    );
  } catch {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: [],
        legacyProgress: {},
      },
      null,
      2
    );
  }
}

/**
 * 从 JSON 字符串导入进度数据
 * 同时恢复 IndexedDB 的 ProgressRecord 与 localStorage 的 ProgressMap
 * @param json - JSON 字符串（由 exportProgress 产生）
 */
export async function importProgress(json: string): Promise<void> {
  try {
    const parsed = JSON.parse(json) as {
      records?: ProgressRecord[];
      legacyProgress?: ProgressMap;
    };
    const repo = getProgressRepository();
    if (parsed.records) {
      await repo.importJSON(JSON.stringify({ records: parsed.records }));
    }
    if (parsed.legacyProgress) {
      saveProgressMap(parsed.legacyProgress);
    }
    notifyProgressChange();
  } catch {
    // 导入异常静默忽略
  }
}

/**
 * 推荐下一步学习文档
 * 推荐策略：
 * 1. 优先推荐"继续上次学习"（进行中且最近阅读的文档）
 * 2. 推荐前置依赖已完成的新文档
 * 3. 推荐未开始的进阶文档
 * @param limit - 最大返回数量（默认 5）
 * @returns 推荐文档列表
 */
export async function getRecommendedNext(limit = 5): Promise<RecommendedDoc[]> {
  try {
    const repo = getProgressRepository();
    const records = await repo.getAll();
    const recommendations: RecommendedDoc[] = [];

    // 1. 进行中（reading）的文档，按最近阅读时间倒序
    const inProgress = records
      .filter((r) => r.status === 'reading')
      .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0));
    for (const r of inProgress.slice(0, 2)) {
      recommendations.push({
        docSlug: r.docSlug,
        moduleId: r.moduleId,
        title: extractSlug(r.docSlug),
        reason: '继续上次学习',
      });
    }

    // 2. 未开始的文档（推荐前置依赖已完成）
    const notStarted = records.filter((r) => r.status === 'not-started');
    // 已完成模块集合
    const completedModuleIds = new Set<string>();
    for (const r of records) {
      if (r.status === 'completed') {
        completedModuleIds.add(r.moduleId);
      }
    }
    for (const r of notStarted.slice(0, 2)) {
      const reason = completedModuleIds.has(r.moduleId) ? '前置依赖已完成' : '推荐进阶';
      recommendations.push({
        docSlug: r.docSlug,
        moduleId: r.moduleId,
        title: extractSlug(r.docSlug),
        reason,
      });
    }

    // 3. 若推荐数不足，从 legacy ProgressMap 中补充
    if (recommendations.length < limit) {
      const legacy = getAllProgressRaw();
      const legacyReading = Object.entries(legacy)
        .filter(([_, p]) => p.status === 'reading')
        .sort(([_, a], [__, b]) => b.lastRead - a.lastRead);
      for (const [docId] of legacyReading) {
        if (recommendations.length >= limit) break;
        if (recommendations.some((r) => r.docSlug === docId)) continue;
        recommendations.push({
          docSlug: docId,
          moduleId: extractModuleId(docId),
          title: extractSlug(docId),
          reason: '继续上次学习',
        });
      }
    }

    return recommendations.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * 从 IndexedDB 同步数据到 localStorage 缓存
 * 用于跨设备恢复或缓存丢失时重建本地状态
 * @returns 是否同步成功
 */
export async function syncFromIndexedDB(): Promise<boolean> {
  try {
    const repo = getProgressRepository();
    const records = await repo.getAll();
    // 将 ProgressRecord 转换回 ReadingProgress 写入 localStorage
    const progressMap: ProgressMap = {};
    for (const record of records) {
      progressMap[record.docSlug] = {
        status: mapProgressStatusToLegacy(record.status),
        lastRead: record.lastReadAt ?? Date.now(),
        scrollPos: 0,
      };
    }
    saveProgressMap(progressMap);
    notifyProgressChange();
    return true;
  } catch {
    return false;
  }
}

// ── 内部辅助函数 ──────────────────────────────────────────────────────────

/**
 * 内部：保存进度映射表到 localStorage
 * 直接写入 localStorage，作为 removeProgress 和 clearAllProgress 的底层实现
 * @param data - 进度映射表
 */
function saveProgressMap(data: ProgressMap): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 内部：派发进度变更事件，通知订阅者
 * 仅在客户端环境执行
 */
function notifyProgressChange(): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(PROGRESS_CHANGE_EVENT));
}

/**
 * 异步双写：将 setProgress 的写入同步到 IndexedDB
 * 从 docId 中解析 moduleId，构造 ProgressRecord 并 upsert
 * @param docId - 文档唯一标识（moduleId/slug）
 * @param status - 阅读状态
 * @param scrollPos - 滚动位置
 */
async function syncToIndexedDB(docId: string, status: DocStatus, scrollPos: number): Promise<void> {
  try {
    const repo = getProgressRepository();
    const existing = await repo.get(docId);
    const moduleId = extractModuleId(docId);
    const now = Date.now();
    const progressStatus = mapLegacyStatus(status);
    const progress =
      status === 'done' ? 100 : status === 'reading' ? (existing?.progress ?? 50) : 0;
    const baseRecord: ProgressRecord = {
      docSlug: docId,
      moduleId,
      status: progressStatus,
      progress,
      readingTime: existing?.readingTime ?? 0,
      bookmarked: existing?.bookmarked ?? false,
      lastReadAt: now,
    };
    // 仅在完成状态下添加 completedAt（exactOptionalPropertyTypes 不允许显式 undefined）
    if (status === 'done') {
      baseRecord.completedAt = existing?.completedAt ?? now;
    }
    // 滚动位置作为参考但不存入 ProgressRecord（ProgressRecord 不含此字段）
    void scrollPos;
    await repo.upsert(baseRecord);
  } catch {
    // 异步写入失败静默忽略
  }
}

/**
 * 从 docId 中提取 moduleId
 * @param docId - 文档唯一标识（格式 "moduleId/slug"）
 * @returns 模块 ID；无斜线时返回 docId 本身
 */
function extractModuleId(docId: string): string {
  const slashIdx = docId.indexOf('/');
  return slashIdx >= 0 ? docId.slice(0, slashIdx) : docId;
}

/**
 * 从 docId 中提取 slug（用于显示标题）
 * @param docId - 文档唯一标识
 * @returns slug 部分
 */
function extractSlug(docId: string): string {
  const slashIdx = docId.indexOf('/');
  return slashIdx >= 0 ? docId.slice(slashIdx + 1) : docId;
}

/**
 * 将 legacy DocStatus 映射为新的 ProgressStatus
 * @param status - 旧状态值
 * @returns 新状态值
 */
function mapLegacyStatus(status: DocStatus): ProgressStatus {
  switch (status) {
    case 'done':
      return 'completed';
    case 'reading':
      return 'reading';
    case 'unread':
    default:
      return 'not-started';
  }
}

/**
 * 将新 ProgressStatus 映射回 legacy DocStatus
 * @param status - 新状态值
 * @returns 旧状态值
 */
function mapProgressStatusToLegacy(status: ProgressStatus): DocStatus {
  switch (status) {
    case 'completed':
      return 'done';
    case 'reading':
      return 'reading';
    case 'not-started':
    default:
      return 'unread';
  }
}

/**
 * 时间戳转 YYYY-MM-DD 字符串
 * @param timestamp - 毫秒时间戳
 * @returns YYYY-MM-DD 格式字符串
 */
function toDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算连续打卡天数
 * 从今天向前回溯，统计连续有活跃记录的天数
 * @param activeDates - 活跃日期集合（YYYY-MM-DD）
 * @returns 连续天数；今日无记录但昨日有时仍可计算（>=1）
 */
function computeStreakDays(activeDates: Set<string>): number {
  if (activeDates.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);
  // 若今日无记录但昨日有，仍从昨日开始计数（容忍今日尚未学习）
  const todayStr = toDateString(today.getTime());
  if (!activeDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayStr = toDateString(cursor.getTime());
    if (!activeDates.has(yesterdayStr)) return 0;
  }
  while (activeDates.has(toDateString(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * 计算最后活跃日期
 * @param activeDates - 活跃日期集合
 * @returns 最后活跃日期字符串；无记录时返回 undefined
 */
function computeLastActiveDate(activeDates: Set<string>): string | undefined {
  if (activeDates.size === 0) return undefined;
  return Array.from(activeDates).sort().reverse()[0];
}

/**
 * 清空 ProgressRecord 缓存（用于调试或强制从 IndexedDB 重新加载）
 */
export function clearProgressCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RECORDS_CACHE_KEY);
  } catch {
    // 静默忽略
  }
}

export type {
  DocStatus,
  ReadingProgress,
  ProgressMap,
  ProgressChangeCallback,
  ProgressRecord,
  ProgressStatus,
};

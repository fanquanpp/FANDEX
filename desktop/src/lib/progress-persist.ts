/**
 * 阅读进度双层持久化（localStorage + IndexedDB）
 *
 * 功能概述：
 * - 封装 progress 数据的双层持久化逻辑
 * - 写入：localStorage（快速同步）+ IndexedDB（异步大容量备份）
 * - 读取：localStorage 同步优先 → IndexedDB 异步补偿
 * - 启动时从 IndexedDB 同步到 localStorage（修复 localStorage 被清理场景）
 * - 提供 persistProgress / loadAllProgress / clearAllProgressDB 三个核心接口
 *
 * 设计理念：
 * - localStorage 优势：同步读取快，但容量小（5-10MB），可能被用户清理
 * - IndexedDB 优势：容量大（数百 MB），持久性强，但异步访问
 * - 双层方案兼顾性能与可靠性，互为备份
 *
 * 数据结构：
 * - localStorage key: 'fandex-progress'，存储完整 Record<string, ProgressItem>
 * - IndexedDB store: 'progress'，每条记录 { docId, status, lastReadAt }
 *
 * 使用示例：
 *   import { persistProgress, loadAllProgress, clearAllProgressDB } from '@/lib/progress-persist';
 *   await persistProgress('doc-1', 'read', Date.now());
 *   const all = await loadAllProgress();
 *   await clearAllProgressDB();
 */

import { clear, getAll, isIndexedDBAvailable, type ProgressRecord, put } from '@/lib/db';

/** 阅读进度状态类型 */
export type ProgressStatus = 'unread' | 'reading' | 'read';

/** 单条进度数据结构（用于内存与 localStorage） */
export interface ProgressItem {
  /** 阅读状态 */
  status: ProgressStatus;
  /** 最近阅读时间戳（ms） */
  lastReadAt: number;
}

/** 进度数据集合类型（docId → ProgressItem） */
export type ProgressMap = Record<string, ProgressItem>;

/** localStorage 持久化键名 */
const STORAGE_KEY = 'fandex-progress';

/**
 * 从 localStorage 读取所有进度（同步快速路径）
 *
 * 实现说明：
 * - SSR 或 localStorage 不可用时返回空对象
 * - JSON 解析失败时返回空对象，避免脏数据导致崩溃
 *
 * @returns 进度数据集合
 */
export function loadProgressFromStorage(): ProgressMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch (err) {
    console.error('[progress-persist] loadProgressFromStorage failed:', err);
    return {};
  }
}

/**
 * 将进度集合写入 localStorage（同步快速路径）
 *
 * @param progress - 进度数据集合
 */
function saveProgressToStorage(progress: ProgressMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('[progress-persist] saveProgressToStorage failed:', err);
  }
}

/**
 * 写入单条进度到 IndexedDB（异步备份路径）
 *
 * @param docId - 文档 ID
 * @param status - 阅读状态
 * @param lastReadAt - 最近阅读时间戳
 */
async function putProgressToDB(
  docId: string,
  status: ProgressStatus,
  lastReadAt: number,
): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  const record: ProgressRecord = { docId, status, lastReadAt };
  await put('progress', record);
}

/**
 * 双层持久化单条进度
 *
 * 实现细节：
 * 1. 同步：更新 localStorage（先读出全量，更新单条，再写回）
 * 2. 异步：写入 IndexedDB（不阻塞主流程）
 *
 * @param docId - 文档 ID
 * @param status - 阅读状态
 * @param lastReadAt - 最近阅读时间戳
 */
export async function persistProgress(
  docId: string,
  status: ProgressStatus,
  lastReadAt: number,
): Promise<void> {
  // 同步路径：更新 localStorage
  const current = loadProgressFromStorage();
  current[docId] = { status, lastReadAt };
  saveProgressToStorage(current);

  // 异步路径：写入 IndexedDB（失败不阻塞）
  try {
    await putProgressToDB(docId, status, lastReadAt);
  } catch (err) {
    console.error('[progress-persist] persistProgress IndexedDB write failed:', err);
  }
}

/**
 * 批量写入进度到 localStorage（如启动时从 IndexedDB 同步）
 *
 * @param progress - 完整进度集合
 */
export function saveAllProgressToStorage(progress: ProgressMap): void {
  saveProgressToStorage(progress);
}

/**
 * 从 IndexedDB 加载所有进度数据
 *
 * 实现说明：
 * - IndexedDB 不可用时返回空对象，调用方可降级到 localStorage
 * - 失败时返回空对象
 *
 * @returns 进度数据集合
 */
export async function loadAllProgressFromDB(): Promise<ProgressMap> {
  if (!isIndexedDBAvailable()) return {};
  try {
    const records = await getAll<ProgressRecord>('progress');
    const result: ProgressMap = {};
    for (const record of records) {
      if (record && typeof record.docId === 'string') {
        result[record.docId] = {
          status: record.status,
          lastReadAt: record.lastReadAt,
        };
      }
    }
    return result;
  } catch (err) {
    console.error('[progress-persist] loadAllProgressFromDB failed:', err);
    return {};
  }
}

/**
 * 加载所有进度数据（双层合并）
 *
 * 实现细节：
 * 1. 同步读取 localStorage 数据
 * 2. 异步读取 IndexedDB 数据
 * 3. 合并两层：IndexedDB 中存在但 localStorage 缺失的，补充到 localStorage
 * 4. 同字段冲突时，以 lastReadAt 较新者为准
 *
 * @returns 合并后的进度数据集合
 */
export async function loadAllProgress(): Promise<ProgressMap> {
  const localProgress = loadProgressFromStorage();
  const dbProgress = await loadAllProgressFromDB();

  // 合并两层
  const merged: ProgressMap = { ...localProgress };
  for (const [docId, item] of Object.entries(dbProgress)) {
    const local = merged[docId];
    if (!local) {
      // localStorage 缺失，使用 IndexedDB 数据
      merged[docId] = item;
    } else if (item.lastReadAt > local.lastReadAt) {
      // IndexedDB 数据更新，使用 IndexedDB 数据
      merged[docId] = item;
    }
    // 否则保留 localStorage 数据
  }

  // 将合并结果同步回 localStorage（修复 localStorage 缺失）
  saveAllProgressToStorage(merged);

  return merged;
}

/**
 * 清空所有进度数据（双层）
 *
 * 实现说明：
 * - 清空 localStorage 中的 progress key
 * - 清空 IndexedDB 的 progress store
 *
 * @returns 成功返回 true
 */
export async function clearAllProgressDB(): Promise<boolean> {
  // 清空 localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[progress-persist] clearAllProgressDB localStorage failed:', err);
    }
  }

  // 清空 IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      await clear('progress');
    } catch (err) {
      console.error('[progress-persist] clearAllProgressDB IndexedDB failed:', err);
      return false;
    }
  }

  return true;
}

/**
 * 删除单条进度（双层）
 *
 * @param docId - 文档 ID
 */
export async function deleteProgress(docId: string): Promise<void> {
  // 同步：从 localStorage 删除
  const current = loadProgressFromStorage();
  if (docId in current) {
    delete current[docId];
    saveProgressToStorage(current);
  }

  // 异步：从 IndexedDB 删除
  if (isIndexedDBAvailable()) {
    try {
      const { deleteRecord } = await import('@/lib/db');
      await deleteRecord('progress', docId);
    } catch (err) {
      console.error('[progress-persist] deleteProgress IndexedDB failed:', err);
    }
  }
}

export default {
  persistProgress,
  loadAllProgress,
  loadAllProgressFromDB,
  loadProgressFromStorage,
  saveAllProgressToStorage,
  clearAllProgressDB,
  deleteProgress,
};

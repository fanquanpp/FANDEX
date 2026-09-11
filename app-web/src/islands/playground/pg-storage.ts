/**
 * Playground 本地存储层
 *
 * 功能概述：
 *   - 封装 IndexedDB 访问（Promise 风格），提供前端实验作品库与草稿的增删查改
 *   - 提供浏览器存储配额与用量统计，用于容量预警
 *   - 提供"清空本地数据"入口（仅由用户主动触发，程序不做自动清理）
 *
 * 设计原则：
 *   - 数据只保存在用户浏览器本地：刷新不丢失、不依赖网络、不对外分享
 *   - 所有方法在 SSR 环境（无 window/indexedDB）下安全降级
 *   - 不自动删除任何用户数据；存储占用通过惰性写入与去重控制
 */

import type { FrontendPen } from './types';

/** 数据库名称 */
const DB_NAME = 'fandex-playground';
/** 数据库版本 */
const DB_VERSION = 1;
/** 作品库对象仓库 */
const STORE_PENS = 'pens';
/** 草稿对象仓库（key 为 'frontend'） */
const STORE_DRAFTS = 'drafts';
/** 练习记录对象仓库（历史遗留，仅用于清空兼容；新版本不再写入） */
const STORE_RECORDS = 'records';

/** SSR 环境检测 */
const isClient = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

/** 数据库连接缓存（单例，避免重复打开） */
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * 打开（或创建）IndexedDB 数据库
 * 升级时创建三个对象仓库，均使用 keyPath 'id'
 */
function openDb(): Promise<IDBDatabase> {
  if (!isClient) {
    return Promise.reject(new Error('当前环境不支持 IndexedDB'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PENS)) {
        db.createObjectStore(STORE_PENS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'));
    request.onblocked = () => reject(new Error('IndexedDB 被其他标签页占用'));
  });

  // 连接意外关闭时清空缓存，允许下次重新打开
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/**
 * 在指定事务中执行读取操作
 * @param storeName - 对象仓库名
 * @param operation - 接收仓库对象并返回请求
 */
function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = operation(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB 操作失败'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 事务中止'));
      }),
  );
}

/**
 * 写入记录（存在则覆盖）
 * @param storeName - 对象仓库名
 * @param value - 待写入记录
 */
function idbPut(storeName: string, value: unknown): Promise<IDBValidKey> {
  return withStore<IDBValidKey>(storeName, 'readwrite', (store) => store.put(value));
}

/**
 * 读取单条记录
 * @param storeName - 对象仓库名
 * @param key - 记录主键
 */
function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return withStore<T | undefined>(storeName, 'readonly', (store) => store.get(key) as IDBRequest<T | undefined>);
}

/**
 * 删除单条记录
 * @param storeName - 对象仓库名
 * @param key - 记录主键
 */
function idbDelete(storeName: string, key: string): Promise<undefined> {
  return withStore<undefined>(storeName, 'readwrite', (store) => store.delete(key) as IDBRequest<undefined>);
}

/**
 * 读取整个仓库的全部记录
 * @param storeName - 对象仓库名
 */
function idbAll<T>(storeName: string): Promise<T[]> {
  return withStore<T[]>(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

/** 前端实验草稿的固定 key */
export const DRAFT_PEN_KEY = 'frontend';

/**
 * 保存前端实验草稿（自动保存调用，防抖由 UI 层控制）
 * @param pen - 当前编辑中的作品
 * @returns 是否写入成功；失败时 UI 层显示未保存状态
 */
export async function savePenDraft(pen: FrontendPen): Promise<boolean> {
  if (!isClient) return false;
  try {
    await idbPut(STORE_DRAFTS, pen);
    return true;
  } catch {
    // 存储失败不阻断编辑，UI 层据返回值显示未保存状态
    return false;
  }
}

/**
 * 读取前端实验草稿
 * @returns 草稿作品；不存在时返回 null
 */
export async function loadPenDraft(): Promise<FrontendPen | null> {
  if (!isClient) return null;
  try {
    const pen = await idbGet<FrontendPen>(STORE_DRAFTS, DRAFT_PEN_KEY);
    return pen ?? null;
  } catch {
    return null;
  }
}

/**
 * 保存前端实验到作品库（新建或更新）
 * @param pen - 作品记录
 */
export async function savePen(pen: FrontendPen): Promise<void> {
  if (!isClient) return;
  await idbPut(STORE_PENS, pen);
}

/**
 * 读取作品库中的全部作品（按最后修改时间倒序）
 */
export async function loadPens(): Promise<FrontendPen[]> {
  if (!isClient) return [];
  try {
    const pens = await idbAll<FrontendPen>(STORE_PENS);
    return pens.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/**
 * 删除作品库中的一条作品（仅用户主动操作）
 * @param id - 作品 ID
 */
export async function deletePen(id: string): Promise<void> {
  if (!isClient) return;
  try {
    await idbDelete(STORE_PENS, id);
  } catch {
    // 删除失败忽略，下次可重试
  }
}

/**
 * 获取浏览器为本站点分配的存储配额与实际用量
 * 用于容量提示；浏览器不支持时返回 0
 */
export async function getStorageUsage(): Promise<{ quotaBytes: number; usageBytes: number }> {
  if (!isClient || typeof navigator.storage?.estimate !== 'function') {
    return { quotaBytes: 0, usageBytes: 0 };
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      quotaBytes: estimate.quota ?? 0,
      usageBytes: estimate.usage ?? 0,
    };
  } catch {
    return { quotaBytes: 0, usageBytes: 0 };
  }
}

/**
 * 清空 Playground 全部本地数据（仅由用户主动点击确认后调用）
 * 删除作品库与草稿两个对象仓库的数据；
 * STORE_RECORDS 为历史遗留仓库，仅在此处保留清空兼容
 */
export async function clearAllPlaygroundData(): Promise<void> {
  if (!isClient) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PENS, STORE_DRAFTS, STORE_RECORDS], 'readwrite');
    tx.objectStore(STORE_PENS).clear();
    tx.objectStore(STORE_DRAFTS).clear();
    tx.objectStore(STORE_RECORDS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('清空数据失败'));
    tx.onabort = () => reject(tx.error ?? new Error('清空数据失败'));
  });
}

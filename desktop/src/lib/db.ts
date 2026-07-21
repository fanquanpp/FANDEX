/**
 * IndexedDB 单例连接与通用操作封装
 *
 * 功能概述：
 * - 使用原生 IndexedDB API（不依赖 idb 库），减少第三方依赖
 * - 单例模式管理数据库连接，避免重复打开
 * - 提供通用 CRUD 操作：get / getAll / getAllByIndex / put / delete / clear
 * - 所有操作返回 Promise，失败时优雅降级
 * - 支持 SSR 环境（typeof indexeddb === 'undefined' 时返回 rejected Promise）
 *
 * 数据库结构：
 * - 数据库名：fandex
 * - 版本：1
 * - Object stores：
 *   1. progress：keyPath 'docId'，存储 { docId, status, lastReadAt }
 *   2. annotations：keyPath 'id'，索引 'docId'，存储完整 Annotation 对象
 *   3. cache：keyPath 'key'，存储缓存数据（搜索索引、术语表索引等）
 *
 * 错误处理策略：
 * - 所有方法 catch 异常并返回安全默认值（null / [] / false）
 * - 调用方应通过返回值判断操作是否成功，决定是否降级到 localStorage
 *
 * 使用示例：
 *   import { getDb, getAll, put } from '@/lib/db';
 *   const allProgress = await getAll('progress');
 *   await put('progress', { docId: 'x', status: 'read', lastReadAt: Date.now() });
 */

/** IndexedDB 数据库名 */
const DB_NAME = 'fandex';

/** 数据库版本号 */
const DB_VERSION = 1;

/** Object store 名称联合类型 */
export type StoreName = 'progress' | 'annotations' | 'cache';

/** progress store 记录结构 */
export interface ProgressRecord {
  docId: string;
  status: 'unread' | 'reading' | 'read';
  lastReadAt: number;
}

/** annotations store 记录结构（与 annotations-store 的 Annotation 兼容） */
export interface AnnotationRecord {
  id: string;
  docId: string;
  text: string;
  textOffset: { start: number; end: number };
  note: string;
  noteFormat: 'json' | 'html';
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  createdAt: number;
  updatedAt: number;
}

/** cache store 记录结构 */
export interface CacheRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

/** 数据库单例 Promise（避免重复打开） */
let dbPromise: Promise<IDBDatabase> | null = null;

/** IndexedDB 是否可用（SSR / 不支持时返回 false） */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * 打开数据库并初始化 object stores
 *
 * 实现说明：
 * - onupgradeneeded 中创建 stores 与索引
 * - onerror / onblocked 转换为 rejected Promise
 * - 调用方通过 try-catch 处理失败场景
 *
 * @returns IDBDatabase 实例的 Promise
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('[db] IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建 progress store（如不存在）
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'docId' });
      }

      // 创建 annotations store（如不存在），并建立 docId 索引
      if (!db.objectStoreNames.contains('annotations')) {
        const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
        annotationStore.createIndex('docId', 'docId', { unique: false });
      }

      // 创建 cache store（如不存在）
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error ?? new Error('[db] openDatabase failed'));
    };

    request.onblocked = () => {
      reject(new Error('[db] database open blocked by another connection'));
    };
  });
}

/**
 * 获取 IndexedDB 单例连接
 *
 * 实现说明：
 * - 首次调用触发 openDatabase，结果缓存到模块级变量
 * - 后续调用直接返回缓存的 Promise
 * - 失败时清空缓存，下次调用重新尝试
 *
 * @returns IDBDatabase 实例的 Promise
 */
export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((err) => {
      // 失败时清空缓存，允许下次调用重试
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/**
 * 通用请求封装（将 IDBRequest 转为 Promise）
 *
 * @param request - IDBRequest 实例
 * @returns Promise<T>，resolve 值为 request.result
 */
function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('[db] request failed'));
  });
}

/**
 * 在指定 store 上执行事务操作
 *
 * 实现说明：
 * - 封装事务创建与 store 获取逻辑
 * - mode 默认 readonly，写入场景需传 'readwrite'
 *
 * @param storeName - object store 名称
 * @param mode - 事务模式
 * @param callback - 接收 store，返回 Promise 或同步值
 * @returns callback 的返回值
 */
async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await getDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result: T;
    Promise.resolve(callback(store))
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        reject(err);
      });

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error('[db] transaction error'));
    transaction.onabort = () => reject(transaction.error ?? new Error('[db] transaction aborted'));
  });
}

/**
 * 根据 key 获取单条记录
 *
 * @param storeName - object store 名称
 * @param key - 主键
 * @returns 记录值（不存在时返回 undefined），失败时返回 null
 */
export async function get<T = unknown>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
  try {
    return (
      (await withStore<T | undefined>(storeName, 'readonly', (store) =>
        wrapRequest<T>(store.get(key) as IDBRequest<T>),
      )) ?? null
    );
  } catch (err) {
    console.error(`[db] get(${storeName}, ${String(key)}) failed:`, err);
    return null;
  }
}

/**
 * 获取 store 中所有记录
 *
 * @param storeName - object store 名称
 * @returns 记录数组，失败时返回空数组
 */
export async function getAll<T = unknown>(storeName: StoreName): Promise<T[]> {
  try {
    const result = await withStore<T[]>(storeName, 'readonly', (store) =>
      wrapRequest<T[]>(store.getAll() as IDBRequest<T[]>),
    );
    return result ?? [];
  } catch (err) {
    console.error(`[db] getAll(${storeName}) failed:`, err);
    return [];
  }
}

/**
 * 通过索引查询所有匹配记录
 *
 * @param storeName - object store 名称
 * @param indexName - 索引名称
 * @param value - 索引查询值
 * @returns 记录数组，失败时返回空数组
 */
export async function getAllByIndex<T = unknown>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  try {
    return (
      (await withStore<T[]>(storeName, 'readonly', (store) => {
        const index = store.index(indexName);
        return wrapRequest<T[]>(index.getAll(value) as IDBRequest<T[]>);
      })) ?? []
    );
  } catch (err) {
    console.error(`[db] getAllByIndex(${storeName}, ${indexName}) failed:`, err);
    return [];
  }
}

/**
 * 写入（新增或更新）一条记录
 *
 * @param storeName - object store 名称
 * @param value - 记录值
 * @returns 成功返回 true，失败返回 false
 */
export async function put<T = unknown>(storeName: StoreName, value: T): Promise<boolean> {
  try {
    await withStore(storeName, 'readwrite', (store) =>
      wrapRequest(store.put(value as unknown as Record<string, unknown>)),
    );
    return true;
  } catch (err) {
    console.error(`[db] put(${storeName}) failed:`, err);
    return false;
  }
}

/**
 * 批量写入记录（单事务，原子性保证）
 *
 * @param storeName - object store 名称
 * @param values - 记录数组
 * @returns 成功返回 true，失败返回 false
 */
export async function putBatch<T = unknown>(storeName: StoreName, values: T[]): Promise<boolean> {
  if (values.length === 0) return true;
  try {
    await withStore(storeName, 'readwrite', (store) => {
      for (const value of values) {
        store.put(value as unknown as Record<string, unknown>);
      }
    });
    return true;
  } catch (err) {
    console.error(`[db] putBatch(${storeName}) failed:`, err);
    return false;
  }
}

/**
 * 根据 key 删除单条记录
 *
 * @param storeName - object store 名称
 * @param key - 主键
 * @returns 成功返回 true，失败返回 false
 */
export async function deleteRecord(storeName: StoreName, key: IDBValidKey): Promise<boolean> {
  try {
    await withStore(storeName, 'readwrite', (store) => store.delete(key));
    return true;
  } catch (err) {
    console.error(`[db] delete(${storeName}, ${String(key)}) failed:`, err);
    return false;
  }
}

/**
 * 通过索引清除所有匹配记录（如删除某 docId 的所有 annotations）
 *
 * @param storeName - object store 名称
 * @param indexName - 索引名称
 * @param value - 索引查询值
 * @returns 成功返回 true，失败返回 false
 */
export async function deleteByIndex(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<boolean> {
  try {
    await withStore(storeName, 'readwrite', async (store) => {
      const index = store.index(indexName);
      const request = index.openCursor(value);
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error ?? new Error('[db] cursor delete failed'));
      });
    });
    return true;
  } catch (err) {
    console.error(`[db] deleteByIndex(${storeName}, ${indexName}) failed:`, err);
    return false;
  }
}

/**
 * 清空指定 store 的所有记录
 *
 * @param storeName - object store 名称
 * @returns 成功返回 true，失败返回 false
 */
export async function clear(storeName: StoreName): Promise<boolean> {
  try {
    await withStore(storeName, 'readwrite', (store) => store.clear());
    return true;
  } catch (err) {
    console.error(`[db] clear(${storeName}) failed:`, err);
    return false;
  }
}

export default {
  isIndexedDBAvailable,
  getDb,
  get,
  getAll,
  getAllByIndex,
  put,
  putBatch,
  deleteRecord,
  deleteByIndex,
  clear,
};

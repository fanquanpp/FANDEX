
import type { FrontendPen } from './types';

const DB_NAME = 'fandex-playground';
const DB_VERSION = 1;
const STORE_PENS = 'pens';
const STORE_DRAFTS = 'drafts';
const STORE_RECORDS = 'records';

const isClient = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase> | null = null;

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

  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

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

function idbPut(storeName: string, value: unknown): Promise<IDBValidKey> {
  return withStore<IDBValidKey>(storeName, 'readwrite', (store) => store.put(value));
}

function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return withStore<T | undefined>(storeName, 'readonly', (store) => store.get(key) as IDBRequest<T | undefined>);
}

function idbDelete(storeName: string, key: string): Promise<undefined> {
  return withStore<undefined>(storeName, 'readwrite', (store) => store.delete(key) as IDBRequest<undefined>);
}

function idbAll<T>(storeName: string): Promise<T[]> {
  return withStore<T[]>(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

// 草稿记录固定以 DRAFT_PEN_KEY 为键存取；历史版本曾把记录写在 pen.id（'draft'）下，
// 读取时兼容迁移，避免老用户已有草稿丢失。
export const DRAFT_PEN_KEY = 'frontend';
const LEGACY_DRAFT_KEY = 'draft';

export async function savePenDraft(pen: FrontendPen): Promise<boolean> {
  if (!isClient) return false;
  try {
    await idbPut(STORE_DRAFTS, { ...pen, id: DRAFT_PEN_KEY });
    return true;
  } catch {
    return false;
  }
}

export async function loadPenDraft(): Promise<FrontendPen | null> {
  if (!isClient) return null;
  try {
    const pen = await idbGet<FrontendPen>(STORE_DRAFTS, DRAFT_PEN_KEY);
    if (pen) return pen;
    const legacy = await idbGet<FrontendPen>(STORE_DRAFTS, LEGACY_DRAFT_KEY);
    if (legacy) {
      await idbPut(STORE_DRAFTS, { ...legacy, id: DRAFT_PEN_KEY });
      await idbDelete(STORE_DRAFTS, LEGACY_DRAFT_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export async function savePen(pen: FrontendPen): Promise<void> {
  if (!isClient) return;
  await idbPut(STORE_PENS, pen);
}

export async function loadPens(): Promise<FrontendPen[]> {
  if (!isClient) return [];
  try {
    const pens = await idbAll<FrontendPen>(STORE_PENS);
    return pens.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deletePen(id: string): Promise<void> {
  if (!isClient) return;
  try {
    await idbDelete(STORE_PENS, id);
  } catch {
    // 删除失败忽略，下次可重试
  }
}

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

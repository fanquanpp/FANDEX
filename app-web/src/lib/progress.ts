const STORAGE_KEY = 'fandex-progress';
const DB_NAME = 'fandex-progress-db';
const DB_STORE = 'progress';
const DB_VERSION = 2;

export type DocStatus = 'unread' | 'reading' | 'done';

export interface ReadingProgress {
  status: DocStatus;
  lastRead: number;
  scrollPos: number;
}

export type ProgressMap = Record<string, ReadingProgress>;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[FANDEX] IndexedDB open failed', req.error);
      reject(req.error);
    };
  });
}

async function backupToIndexedDB(data: ProgressMap): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.put(data, STORAGE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        console.error('[FANDEX] IndexedDB backup failed', tx.error);
        reject(tx.error);
      };
    });
  } catch (e) {
    console.error('[FANDEX] Backup failed', e);
    window.dispatchEvent(
      new CustomEvent('toast', {
        detail: { message: '进度备份失败，请检查存储空间', type: 'error' },
      })
    );
  }
}

export function getAllProgress(): ProgressMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllProgress(data: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    backupToIndexedDB(data);
  } catch (e) {
    console.error('[FANDEX] localStorage save failed', e);
    window.dispatchEvent(
      new CustomEvent('toast', {
        detail: { message: '进度保存失败，请检查存储空间', type: 'error' },
      })
    );
  }
}

export function getProgress(slug: string): ReadingProgress | null {
  const all = getAllProgress();
  return all[slug] || null;
}

export function setProgress(slug: string, status: DocStatus, scrollPos = 0): void {
  const all = getAllProgress();
  all[slug] = { status, lastRead: Date.now(), scrollPos };
  saveAllProgress(all);
}

export function toggleStatus(slug: string): DocStatus {
  const current = getProgress(slug);
  let next: DocStatus;
  if (!current || current.status === 'unread') {
    next = 'reading';
  } else if (current.status === 'reading') {
    next = 'done';
  } else {
    next = 'unread';
  }
  setProgress(slug, next);
  return next;
}

export function getModuleProgress(
  moduleId: string,
  slugs: string[]
): { done: number; total: number; percent: number } {
  const all = getAllProgress();
  let done = 0;
  for (const slug of slugs) {
    const key = `${moduleId}/${slug}`;
    if (all[key]?.status === 'done') done++;
  }
  return {
    done,
    total: slugs.length,
    percent: slugs.length ? Math.round((done / slugs.length) * 100) : 0,
  };
}

export function exportProgress(): string {
  return JSON.stringify(getAllProgress(), null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const data = JSON.parse(json) as ProgressMap;
    if (typeof data !== 'object' || data === null) return false;
    const current = getAllProgress();
    for (const [slug, progress] of Object.entries(data)) {
      if (progress && typeof progress.status === 'string') {
        const existing = current[slug];
        if (!existing || progress.lastRead > existing.lastRead) {
          current[slug] = progress;
        }
      }
    }
    saveAllProgress(current);
    return true;
  } catch {
    return false;
  }
}

export async function restoreFromIndexedDB(): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.get(STORAGE_KEY);
    req.onsuccess = () => {
      if (req.result) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(req.result));
          resolve(true);
        } catch {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    };
    req.onerror = () => resolve(false);
  });
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      window.dispatchEvent(new CustomEvent('progress-sync'));
    }
  });
}

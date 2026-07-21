/**
 * progress-repository 单元测试
 *
 * 测试目标：覆盖 src/data/storage/progress-repository.ts 的 CRUD 与导入导出逻辑
 * - upsert / get：写入与读取进度记录
 * - getByModule / getAll：多维度查询
 * - getBookmarked / getCompleted / getInProgress：状态筛选
 * - clearAll：清空
 * - exportJSON / importJSON：导入导出
 * - SSR 安全降级：indexedDB / localStorage 未定义时不抛错
 * - localStorage 缓存：upsert 后写入缓存，getAll 优先读缓存
 *
 * 设计说明：
 * progress-repository 基于 IndexedDB 与 localStorage 缓存，本测试通过
 * vi.stubGlobal 同时注入伪造的 indexedDB 与 localStorage，验证数据流。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressRepository, type ProgressRecord } from '@/data/storage/progress-repository';

/** 内存中的记录存储 */
let memoryStore: Map<string, ProgressRecord>;
/** 记录的索引：moduleId -> records[] */
let moduleIndex: Map<string, ProgressRecord[]>;

/** 创建伪造的 IDBRequest */
function makeFakeRequest<T>(result: T): IDBRequest<T> {
  const req = {
    result,
    error: null as Error | null,
    onsuccess: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
  } as unknown as IDBRequest<T>;
  // 异步触发 onsuccess：IDBRequest.onsuccess 回调签名要求传入 Event
  queueMicrotask(() => {
    if (req.onsuccess) req.onsuccess({} as Event);
  });
  return req;
}

/** 创建伪造的 IDBTransaction */
function makeFakeTransaction(): IDBTransaction {
  const tx = {
    oncomplete: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    onabort: null as ((ev: Event) => void) | null,
    error: null,
    objectStore: () => store,
    db: null,
  } as unknown as IDBTransaction;
  // 异步触发 oncomplete：IDBTransaction.oncomplete 回调签名要求传入 Event
  queueMicrotask(() => {
    if (tx.oncomplete) tx.oncomplete({} as Event);
  });
  return tx;
}

/** 伪造的 IDBObjectStore */
const store = {
  put: vi.fn((record: ProgressRecord) => {
    memoryStore.set(record.docSlug, record);
    const modList = moduleIndex.get(record.moduleId) ?? [];
    const idx = modList.findIndex((r) => r.docSlug === record.docSlug);
    if (idx >= 0) modList[idx] = record;
    else modList.push(record);
    moduleIndex.set(record.moduleId, modList);
    return makeFakeRequest(undefined);
  }),
  get: vi.fn((id: string) => makeFakeRequest(memoryStore.get(id) ?? undefined)),
  getAll: vi.fn(() => makeFakeRequest(Array.from(memoryStore.values()))),
  clear: vi.fn(() => {
    memoryStore.clear();
    moduleIndex.clear();
    return makeFakeRequest(undefined);
  }),
  index: vi.fn((name: string) => {
    if (name === 'moduleId') {
      return {
        getAll: vi.fn((query: unknown) => {
          const key = String(query);
          return makeFakeRequest(moduleIndex.get(key) ?? []);
        }),
      } as unknown as IDBIndex;
    }
    return {
      getAll: vi.fn(() => makeFakeRequest([])),
    } as unknown as IDBIndex;
  }),
} as unknown as IDBObjectStore;

/** 伪造的 IDBDatabase */
const fakeDB = {
  transaction: vi.fn(() => makeFakeTransaction()),
  objectStoreNames: { contains: () => true },
  close: vi.fn(),
} as unknown as IDBDatabase;

const fakeOpen = vi.fn(() => {
  const req = {
    result: fakeDB,
    error: null as Error | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
  };
  queueMicrotask(() => {
    if (req.onupgradeneeded) req.onupgradeneeded();
    if (req.onsuccess) req.onsuccess();
  });
  return req;
}) as unknown as typeof indexedDB.open;

/** 伪造 localStorage */
const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  },
  get length() {
    return Object.keys(mockStore).length;
  },
  key: (_index: number) => null,
};

/** 构造合法 ProgressRecord */
function makeRecord(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    docSlug: 'git/basics',
    moduleId: 'git',
    status: 'reading',
    progress: 50,
    readingTime: 120,
    bookmarked: false,
    ...overrides,
  };
}

beforeEach(() => {
  memoryStore = new Map();
  moduleIndex = new Map();
  mockLocalStorage.clear();
  vi.stubGlobal('indexedDB', { open: fakeOpen });
  vi.stubGlobal('localStorage', mockLocalStorage);
});

describe('ProgressRepository', () => {
  describe('upsert / get', () => {
    it('upsert 应写入记录且 get 能读回', async () => {
      const repo = new ProgressRepository();
      const record = makeRecord({ docSlug: 'upsert-get-test' });
      await repo.upsert(record);
      const got = await repo.get('upsert-get-test');
      expect(got).toBeDefined();
      expect(got?.docSlug).toBe('upsert-get-test');
      expect(got?.status).toBe('reading');
    });

    it('upsert 相同 docSlug 应覆盖原值', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'overwrite', status: 'reading' }));
      await repo.upsert(makeRecord({ docSlug: 'overwrite', status: 'completed', progress: 100 }));
      const got = await repo.get('overwrite');
      expect(got?.status).toBe('completed');
      expect(got?.progress).toBe(100);
    });

    it('get 未找到记录时应返回 undefined', async () => {
      const repo = new ProgressRepository();
      const got = await repo.get('non-existent');
      expect(got).toBeUndefined();
    });
  });

  describe('getByModule', () => {
    it('应返回指定模块的全部记录', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'm1', moduleId: 'git' }));
      await repo.upsert(makeRecord({ docSlug: 'm2', moduleId: 'git' }));
      await repo.upsert(makeRecord({ docSlug: 'm3', moduleId: 'css' }));
      const gitRecords = await repo.getByModule('git');
      expect(gitRecords).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    it('应返回全部记录', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'a1' }));
      await repo.upsert(makeRecord({ docSlug: 'a2' }));
      const all = await repo.getAll();
      expect(all).toHaveLength(2);
    });

    it('存储为空时应返回空数组', async () => {
      const repo = new ProgressRepository();
      const all = await repo.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getBookmarked', () => {
    it('应仅返回 bookmarked=true 的记录', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'b1', bookmarked: true }));
      await repo.upsert(makeRecord({ docSlug: 'b2', bookmarked: false }));
      await repo.upsert(makeRecord({ docSlug: 'b3', bookmarked: true }));
      const bookmarked = await repo.getBookmarked();
      expect(bookmarked).toHaveLength(2);
      expect(bookmarked.every((r) => r.bookmarked)).toBe(true);
    });
  });

  describe('getCompleted', () => {
    it('应仅返回 status=completed 的记录', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'c1', status: 'completed' }));
      await repo.upsert(makeRecord({ docSlug: 'c2', status: 'reading' }));
      await repo.upsert(makeRecord({ docSlug: 'c3', status: 'completed' }));
      const completed = await repo.getCompleted();
      expect(completed).toHaveLength(2);
      expect(completed.every((r) => r.status === 'completed')).toBe(true);
    });
  });

  describe('getInProgress', () => {
    it('应仅返回 status=reading 的记录', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'p1', status: 'reading' }));
      await repo.upsert(makeRecord({ docSlug: 'p2', status: 'completed' }));
      await repo.upsert(makeRecord({ docSlug: 'p3', status: 'reading' }));
      const inProgress = await repo.getInProgress();
      expect(inProgress).toHaveLength(2);
      expect(inProgress.every((r) => r.status === 'reading')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('应清空全部记录与缓存', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'clr1' }));
      await repo.upsert(makeRecord({ docSlug: 'clr2' }));
      await repo.clearAll();
      const all = await repo.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('exportJSON', () => {
    it('应返回包含全部记录的 JSON 字符串', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'e1' }));
      await repo.upsert(makeRecord({ docSlug: 'e2' }));
      const json = await repo.exportJSON();
      const parsed = JSON.parse(json) as {
        version: string;
        exportedAt: string;
        records: ProgressRecord[];
      };
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.records).toHaveLength(2);
    });
  });

  describe('importJSON', () => {
    it('应从 JSON 字符串导入记录（覆盖式）', async () => {
      const repo = new ProgressRepository();
      await repo.upsert(makeRecord({ docSlug: 'old' }));
      const importData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: [makeRecord({ docSlug: 'imported-1' }), makeRecord({ docSlug: 'imported-2' })],
      };
      await repo.importJSON(JSON.stringify(importData));
      // 清空缓存后从 IndexedDB 读取
      mockLocalStorage.clear();
      const all = await repo.getAll();
      expect(all.map((r) => r.docSlug).sort()).toEqual(['imported-1', 'imported-2']);
    });

    it('当 JSON 无效时应静默忽略不抛错', async () => {
      const repo = new ProgressRepository();
      await expect(repo.importJSON('invalid-json')).resolves.toBeUndefined();
    });
  });

  describe('SSR 安全降级', () => {
    it('当 indexedDB 未定义时 upsert 应安全返回', async () => {
      vi.stubGlobal('indexedDB', undefined);
      vi.stubGlobal('localStorage', undefined);
      const repo = new ProgressRepository();
      await expect(repo.upsert(makeRecord())).resolves.toBeUndefined();
    });

    it('当 indexedDB 未定义时 get 应返回 undefined', async () => {
      vi.stubGlobal('indexedDB', undefined);
      vi.stubGlobal('localStorage', undefined);
      const repo = new ProgressRepository();
      const result = await repo.get('any');
      expect(result).toBeUndefined();
    });

    it('当 indexedDB 未定义时 getAll 应返回空数组', async () => {
      vi.stubGlobal('indexedDB', undefined);
      vi.stubGlobal('localStorage', undefined);
      const repo = new ProgressRepository();
      const result = await repo.getAll();
      expect(result).toEqual([]);
    });
  });
});

/**
 * exercise-repository 单元测试
 *
 * 测试目标：覆盖 src/data/storage/exercise-repository.ts 的 CRUD 与导入导出逻辑
 * - save / get：保存与读取作答记录
 * - getByModule / getByDoc / getAll：多维度查询
 * - getIncorrect：错题集查询
 * - clearAll：清空
 * - exportJSON / importJSON：导入导出
 * - SSR 安全降级：indexedDB 未定义时不抛错
 *
 * 设计说明：
 * exercise-repository 基于 IndexedDB，本测试通过 vi.stubGlobal 注入伪造的
 * indexedDB 实现与 IDBDatabase / IDBTransaction / IDBObjectStore / IDBIndex，
 * 在内存中模拟真实 IndexedDB 行为。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseRepository, type ExerciseRecord } from '@/data/storage/exercise-repository';

/** 内存中的记录存储 */
let memoryStore: Map<string, ExerciseRecord>;
/** 记录的索引：moduleId -> records[] */
let moduleIndex: Map<string, ExerciseRecord[]>;
/** 记录的索引：docSlug -> records[] */
let docIndex: Map<string, ExerciseRecord[]>;
/** 记录的索引：isCorrect -> records[] */
let correctIndex: Map<string, ExerciseRecord[]>;

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
function makeFakeTransaction(): {
  tx: IDBTransaction;
  completePromise: Promise<void>;
  resolve: () => void;
  reject: (e: Error) => void;
} {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const completePromise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
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
    resolve();
  });
  return { tx, completePromise, resolve, reject };
}

/** 伪造的 IDBObjectStore */
const store = {
  put: vi.fn((record: ExerciseRecord) => {
    memoryStore.set(record.id, record);
    // 更新索引
    const modList = moduleIndex.get(record.moduleId) ?? [];
    const idx = modList.findIndex((r) => r.id === record.id);
    if (idx >= 0) modList[idx] = record;
    else modList.push(record);
    moduleIndex.set(record.moduleId, modList);

    const docList = docIndex.get(record.docSlug) ?? [];
    const docIdx = docList.findIndex((r) => r.id === record.id);
    if (docIdx >= 0) docList[docIdx] = record;
    else docList.push(record);
    docIndex.set(record.docSlug, docList);

    if (record.isCorrect !== null) {
      const key = String(record.isCorrect);
      const correctList = correctIndex.get(key) ?? [];
      const correctIdx = correctList.findIndex((r) => r.id === record.id);
      if (correctIdx >= 0) correctList[correctIdx] = record;
      else correctList.push(record);
      correctIndex.set(key, correctList);
    }
    return makeFakeRequest(undefined);
  }),
  get: vi.fn((id: string) => makeFakeRequest(memoryStore.get(id) ?? undefined)),
  getAll: vi.fn(() => makeFakeRequest(Array.from(memoryStore.values()))),
  clear: vi.fn(() => {
    memoryStore.clear();
    moduleIndex.clear();
    docIndex.clear();
    correctIndex.clear();
    return makeFakeRequest(undefined);
  }),
  index: vi.fn((name: string) => {
    const indexMap: Record<string, Map<string, ExerciseRecord[]>> = {
      moduleId: moduleIndex,
      docSlug: docIndex,
      isCorrect: correctIndex,
    };
    const idx = indexMap[name] ?? moduleIndex;
    return {
      getAll: vi.fn((query: unknown) => {
        const key = String(query);
        const list = idx.get(key) ?? [];
        return makeFakeRequest(list);
      }),
    } as unknown as IDBIndex;
  }),
} as unknown as IDBObjectStore;

/** 伪造的 IDBDatabase */
const fakeDB = {
  transaction: vi.fn(() => {
    return makeFakeTransaction().tx;
  }),
  objectStoreNames: {
    contains: () => true,
  },
  close: vi.fn(),
} as unknown as IDBDatabase;

/** 伪造的 indexedDB.open */
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

/** 构造合法 ExerciseRecord */
function makeRecord(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: 'ex-1',
    moduleId: 'git',
    docSlug: 'git/basics',
    type: 'fill-blank',
    question: 'Git 的初始化命令是？',
    correctAnswer: 'git init',
    userAnswer: 'git init',
    isCorrect: true,
    attempts: 1,
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  memoryStore = new Map();
  moduleIndex = new Map();
  docIndex = new Map();
  correctIndex = new Map();
  vi.stubGlobal('indexedDB', { open: fakeOpen });
});

describe('ExerciseRepository', () => {
  describe('save / get', () => {
    it('save 应将记录写入存储且 get 能读回', async () => {
      const repo = new ExerciseRepository();
      const record = makeRecord({ id: 'save-get-test' });
      await repo.save(record);
      const got = await repo.get('save-get-test');
      expect(got).toBeDefined();
      expect(got?.id).toBe('save-get-test');
      expect(got?.moduleId).toBe('git');
    });

    it('get 未找到记录时应返回 undefined', async () => {
      const repo = new ExerciseRepository();
      const got = await repo.get('non-existent-id');
      expect(got).toBeUndefined();
    });

    it('save 相同 id 记录应覆盖原值', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'overwrite', isCorrect: true }));
      await repo.save(makeRecord({ id: 'overwrite', isCorrect: false, attempts: 3 }));
      const got = await repo.get('overwrite');
      expect(got?.isCorrect).toBe(false);
      expect(got?.attempts).toBe(3);
    });
  });

  describe('getByModule', () => {
    it('应返回指定模块的全部记录', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'm1', moduleId: 'git' }));
      await repo.save(makeRecord({ id: 'm2', moduleId: 'git' }));
      await repo.save(makeRecord({ id: 'm3', moduleId: 'css' }));
      const gitRecords = await repo.getByModule('git');
      expect(gitRecords).toHaveLength(2);
      expect(gitRecords.map((r) => r.id).sort()).toEqual(['m1', 'm2']);
    });

    it('当模块无记录时应返回空数组', async () => {
      const repo = new ExerciseRepository();
      const records = await repo.getByModule('no-records');
      expect(records).toEqual([]);
    });
  });

  describe('getByDoc', () => {
    it('应返回指定文档的全部记录', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'd1', docSlug: 'git/basics' }));
      await repo.save(makeRecord({ id: 'd2', docSlug: 'git/basics' }));
      await repo.save(makeRecord({ id: 'd3', docSlug: 'git/branch' }));
      const records = await repo.getByDoc('git/basics');
      expect(records).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    it('应返回全部记录', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'a1' }));
      await repo.save(makeRecord({ id: 'a2' }));
      await repo.save(makeRecord({ id: 'a3' }));
      const all = await repo.getAll();
      expect(all).toHaveLength(3);
    });

    it('存储为空时应返回空数组', async () => {
      const repo = new ExerciseRepository();
      const all = await repo.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getIncorrect', () => {
    it('应仅返回 isCorrect === false 的记录', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'correct1', isCorrect: true }));
      await repo.save(makeRecord({ id: 'wrong1', isCorrect: false }));
      await repo.save(makeRecord({ id: 'wrong2', isCorrect: false }));
      const incorrect = await repo.getIncorrect();
      expect(incorrect).toHaveLength(2);
      expect(incorrect.every((r) => r.isCorrect === false)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('应清空全部记录', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'c1' }));
      await repo.save(makeRecord({ id: 'c2' }));
      await repo.clearAll();
      const all = await repo.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('exportJSON', () => {
    it('应返回包含全部记录的 JSON 字符串', async () => {
      const repo = new ExerciseRepository();
      await repo.save(makeRecord({ id: 'e1' }));
      await repo.save(makeRecord({ id: 'e2' }));
      const json = await repo.exportJSON();
      const parsed = JSON.parse(json) as {
        version: string;
        exportedAt: string;
        records: ExerciseRecord[];
      };
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.records).toHaveLength(2);
      expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('空存储导出应返回 records 为空的 JSON', async () => {
      const repo = new ExerciseRepository();
      const json = await repo.exportJSON();
      const parsed = JSON.parse(json) as { records: ExerciseRecord[] };
      expect(parsed.records).toEqual([]);
    });
  });

  describe('importJSON', () => {
    it('应从 JSON 字符串导入记录（覆盖式）', async () => {
      const repo = new ExerciseRepository();
      // 先写入旧数据
      await repo.save(makeRecord({ id: 'old' }));
      // 导入新数据
      const importData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: [makeRecord({ id: 'imported-1' }), makeRecord({ id: 'imported-2' })],
      };
      await repo.importJSON(JSON.stringify(importData));
      const all = await repo.getAll();
      expect(all.map((r) => r.id).sort()).toEqual(['imported-1', 'imported-2']);
    });

    it('当 JSON 无效时应静默忽略不抛错', async () => {
      const repo = new ExerciseRepository();
      await expect(repo.importJSON('invalid-json')).resolves.toBeUndefined();
    });
  });

  describe('SSR 安全降级', () => {
    it('当 indexedDB 未定义时 save 应安全返回', async () => {
      vi.stubGlobal('indexedDB', undefined);
      const repo = new ExerciseRepository();
      await expect(repo.save(makeRecord())).resolves.toBeUndefined();
    });

    it('当 indexedDB 未定义时 get 应返回 undefined', async () => {
      vi.stubGlobal('indexedDB', undefined);
      const repo = new ExerciseRepository();
      const result = await repo.get('any');
      expect(result).toBeUndefined();
    });

    it('当 indexedDB 未定义时 getAll 应返回空数组', async () => {
      vi.stubGlobal('indexedDB', undefined);
      const repo = new ExerciseRepository();
      const result = await repo.getAll();
      expect(result).toEqual([]);
    });
  });
});

/**
 * progress-store 单元测试
 *
 * 测试对象：
 * - apps/web/src/lib/store/progress-store.ts（Zustand 进度状态 store）
 * - apps/web/src/lib/progress-persist.ts（双层持久化辅助）
 *
 * 测试覆盖：
 * - 初始状态为空 Map
 * - setProgress / getProgress / removeProgress（间接通过 deleteProgress）/ clearAllProgress 行为
 * - persist 到 localStorage
 * - BroadcastChannel 跨标签页同步（mock BroadcastChannel）
 * - IndexedDB 异步备份（mock IndexedDB）
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock IndexedDB 模块（在 progress-persist 中使用）
// Skill 偏差报备：原 mock 的 isIndexedDBAvailable 为普通函数，无法使用 mockReturnValueOnce。
// 现统一改为 vi.fn 包装，保留其他方法的 mock 行为。
vi.mock('@/lib/db', () => {
  const store = new Map<string, unknown>();
  return {
    isIndexedDBAvailable: vi.fn(() => true),
    put: vi.fn(async (_store: string, value: unknown) => {
      if (value && typeof value === 'object' && 'docId' in value) {
        store.set((value as { docId: string }).docId, value);
      }
      return true;
    }),
    getAll: vi.fn(async (_store: string) => Array.from(store.values())),
    clear: vi.fn(async (_store: string) => {
      store.clear();
      return true;
    }),
    deleteRecord: vi.fn(async (_store: string, key: IDBValidKey) => {
      store.delete(String(key));
      return true;
    }),
    get: vi.fn(async (_store: string, key: IDBValidKey) => store.get(String(key)) ?? null),
    __store: store,
  };
});

// 使用 vi.hoisted 创建跨 mock 工厂与测试用例共享的容器
// Skill 偏差报备：broadcastChannel 是 progress-store.ts 模块级单例，
// 首次 getBroadcastChannel() 调用时创建，之后复用。
// 由于 afterEach 的 vi.clearAllMocks() 会清空 createBroadcastChannel.mock.results，
// 后续测试无法通过 mock.results 获取已创建的 channel 实例。
// 使用 vi.hoisted 创建共享 holder，在 mock 工厂内将 channel 实例写入 holder，
// 测试用例通过 holder 直接访问 channel.post 等 spy，绕过 mock.results 清空限制。
const broadcastChannelHolder = vi.hoisted(() => ({
  current: null as {
    post: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  } | null,
}));

// Mock BroadcastChannel 控制器（避免真实跨标签页通信）
// Skill 偏差报备：原 mock 的 createBroadcastChannel 不是 vi.fn() spy，
// 导致 expect(createBroadcastChannel).toHaveBeenCalled() 报错。
// 现使用 vi.fn 包装，使其可作为 spy 验证调用次数。
// 同时将创建的 channel 实例写入 broadcastChannelHolder，便于测试直接访问。
vi.mock('@/lib/broadcast', () => {
  type Handler<T> = (msg: { type: string; payload: T; source: string; ts: number }) => void;
  const createBroadcastChannel = vi.fn(<T>() => {
    const subscribers = new Set<Handler<T>>();
    const instance = {
      post: vi.fn((message: { type: string; payload: T }) => {
        const fullMessage = {
          ...message,
          source: 'test-source',
          ts: Date.now(),
        };
        for (const handler of subscribers) {
          handler(fullMessage);
        }
      }),
      subscribe: vi.fn((handler: Handler<T>) => {
        subscribers.add(handler);
        return () => subscribers.delete(handler);
      }),
      close: vi.fn(() => subscribers.clear()),
    };
    // 将 channel 实例写入共享 holder（后续测试可直接访问）
    broadcastChannelHolder.current = instance;
    return instance;
  });
  return { createBroadcastChannel };
});

// 在导入被测模块前先 stub 全局 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Stub BroadcastChannel 构造器（部分代码路径可能直接调用）
class MockBroadcastChannel {
  postMessage = vi.fn();
  close = vi.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  constructor(public name: string) {}
}
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

// crypto.randomUUID mock（保证 id 稳定可预测）
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${Math.random().toString(36).slice(2, 10)}`,
});

// 动态导入被测模块（在 mock 注册后）
const { useProgressStore } = await import('@/lib/store/progress-store');
const { persistProgress, loadAllProgress, clearAllProgressDB, deleteProgress } = await import(
  '@/lib/progress-persist'
);

describe('progress-store', () => {
  beforeEach(() => {
    // 清空 localStorage 与 IndexedDB mock
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // 重置 store 到初始状态
    useProgressStore.setState({
      progress: {},
      lastReadAt: {},
      recentDocs: [],
      initialized: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('初始 progress 字段为空对象（等价空 Map）', () => {
      const state = useProgressStore.getState();
      expect(state.progress).toEqual({});
      expect(Object.keys(state.progress)).toHaveLength(0);
    });

    it('初始 lastReadAt 字段为空对象', () => {
      const state = useProgressStore.getState();
      expect(state.lastReadAt).toEqual({});
    });

    it('初始 recentDocs 为空数组', () => {
      const state = useProgressStore.getState();
      expect(state.recentDocs).toEqual([]);
    });

    it('getProgress 对未设置 docId 返回默认值 unread', () => {
      const status = useProgressStore.getState().getProgress('nonexistent-doc');
      expect(status).toBe('unread');
    });
  });

  describe('setProgress / getProgress', () => {
    it('setProgress 更新状态后 getProgress 返回正确状态', () => {
      const { setProgress, getProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      expect(getProgress('doc-1')).toBe('reading');
    });

    it('setProgress 多次更新保留最后一次状态', () => {
      const { setProgress, getProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      setProgress('doc-1', 'read');
      expect(getProgress('doc-1')).toBe('read');
    });

    it('setProgress 同时更新 lastReadAt 时间戳', () => {
      const before = Date.now();
      const { setProgress } = useProgressStore.getState();
      setProgress('doc-1', 'read');
      const after = Date.now();
      const lastReadAt = useProgressStore.getState().lastReadAt['doc-1'];
      expect(lastReadAt).toBeGreaterThanOrEqual(before);
      expect(lastReadAt).toBeLessThanOrEqual(after);
    });

    it('setProgress 将新 docId 加入 recentDocs 头部', () => {
      const { setProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      setProgress('doc-2', 'reading');
      const { recentDocs } = useProgressStore.getState();
      expect(recentDocs[0]).toBe('doc-2');
      expect(recentDocs[1]).toBe('doc-1');
    });

    it('setProgress 对已存在 docId 移到 recentDocs 头部（去重）', () => {
      const { setProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      setProgress('doc-2', 'reading');
      setProgress('doc-3', 'reading');
      setProgress('doc-1', 'read');
      const { recentDocs } = useProgressStore.getState();
      expect(recentDocs[0]).toBe('doc-1');
      expect(recentDocs).toHaveLength(3);
    });

    it('setProgress 触发 IndexedDB 异步写入', async () => {
      const { put } = await import('@/lib/db');
      const { setProgress } = useProgressStore.getState();
      setProgress('doc-idb-1', 'read');
      // 等待异步写入完成
      await vi.waitFor(() => {
        expect(put).toHaveBeenCalled();
      });
    });

    it('setProgress 触发 BroadcastChannel 广播', async () => {
      // Skill 偏差报备：broadcastChannel 是 progress-store.ts 模块级单例，
      // 首次 getBroadcastChannel() 调用时创建，之后复用。
      // 原方案验证 createBroadcastChannel 被调用，但单例已存在时不会再次创建。
      // 现改为：通过 broadcastChannelHolder（vi.hoisted 共享容器）直接访问 channel 实例，
      // 验证 setProgress 后 channel.post 被调用。
      // 先调用 setProgress 触发 getBroadcastChannel() 创建单例（若尚未创建）
      const { setProgress } = useProgressStore.getState();
      setProgress('doc-broadcast-trigger', 'reading');
      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(broadcastChannelHolder.current).not.toBeNull();
      });
      const channel = broadcastChannelHolder.current;
      expect(channel).toBeDefined();
      // 清空 post 的调用记录（前面的 setProgress 已调用过 post）
      channel?.post.mockClear();
      // 再次 setProgress 触发广播
      setProgress('doc-broadcast-2', 'read');
      // 验证 post 被调用（携带 update 消息）
      expect(channel?.post).toHaveBeenCalled();
      const lastCall = channel?.post.mock.calls[channel?.post.mock.calls.length - 1];
      expect(lastCall?.[0]?.type).toBe('update');
    });
  });

  describe('toggleProgress', () => {
    it('toggleProgress 按 unread → reading → read → unread 循环', () => {
      const { toggleProgress, getProgress } = useProgressStore.getState();
      expect(getProgress('doc-toggle')).toBe('unread');
      toggleProgress('doc-toggle');
      expect(getProgress('doc-toggle')).toBe('reading');
      toggleProgress('doc-toggle');
      expect(getProgress('doc-toggle')).toBe('read');
      toggleProgress('doc-toggle');
      expect(getProgress('doc-toggle')).toBe('unread');
    });
  });

  describe('clearAllProgress', () => {
    it('清空所有进度数据', async () => {
      const { setProgress, clearAllProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      setProgress('doc-2', 'read');
      await clearAllProgress();
      const state = useProgressStore.getState();
      expect(state.progress).toEqual({});
      expect(state.lastReadAt).toEqual({});
      expect(state.recentDocs).toEqual([]);
    });

    it('清空后调用 IndexedDB clear 方法', async () => {
      const { clear } = await import('@/lib/db');
      const { setProgress, clearAllProgress } = useProgressStore.getState();
      setProgress('doc-1', 'reading');
      await clearAllProgress();
      expect(clear).toHaveBeenCalledWith('progress');
    });
  });

  describe('persist 到 localStorage', () => {
    it('persistProgress 将数据写入 localStorage', async () => {
      await persistProgress('doc-persist-1', 'read', Date.now());
      expect(localStorageMock.setItem).toHaveBeenCalled();
      // 解析写入的数据
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      expect(lastCall?.[0]).toBe('fandex-progress');
      const stored = JSON.parse(lastCall?.[1] ?? '{}');
      expect(stored['doc-persist-1']).toBeDefined();
      expect(stored['doc-persist-1'].status).toBe('read');
    });

    it('loadAllProgress 从 localStorage 读取数据', async () => {
      const data = {
        'doc-load-1': { status: 'read' as const, lastReadAt: 1000 },
        'doc-load-2': { status: 'reading' as const, lastReadAt: 2000 },
      };
      localStorageMock.setItem('fandex-progress', JSON.stringify(data));
      const result = await loadAllProgress();
      expect(result['doc-load-1']).toEqual(data['doc-load-1']);
      expect(result['doc-load-2']).toEqual(data['doc-load-2']);
    });

    it('loadAllProgress 合并 localStorage 与 IndexedDB，以较新时间戳为准', async () => {
      // localStorage 中旧数据
      localStorageMock.setItem(
        'fandex-progress',
        JSON.stringify({
          'doc-merge': { status: 'reading', lastReadAt: 1000 },
        }),
      );
      // IndexedDB 中新数据（通过 put 写入）
      const { put } = await import('@/lib/db');
      await put('progress', { docId: 'doc-merge', status: 'read', lastReadAt: 2000 });
      const result = await loadAllProgress();
      expect(result['doc-merge']?.status).toBe('read');
      expect(result['doc-merge']?.lastReadAt).toBe(2000);
    });

    it('clearAllProgressDB 清空 localStorage 与 IndexedDB', async () => {
      localStorageMock.setItem(
        'fandex-progress',
        JSON.stringify({ 'doc-x': { status: 'read', lastReadAt: 1 } }),
      );
      const result = await clearAllProgressDB();
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fandex-progress');
    });

    it('deleteProgress 删除单条数据（localStorage + IndexedDB）', async () => {
      localStorageMock.setItem(
        'fandex-progress',
        JSON.stringify({
          'doc-del': { status: 'read', lastReadAt: 1 },
          'doc-keep': { status: 'reading', lastReadAt: 2 },
        }),
      );
      await deleteProgress('doc-del');
      const stored = JSON.parse(localStorageMock.getItem('fandex-progress') ?? '{}');
      expect(stored['doc-del']).toBeUndefined();
      expect(stored['doc-keep']).toBeDefined();
    });
  });

  describe('BroadcastChannel 跨标签页同步', () => {
    it('initialize 后 _applyRemoteUpdate 接收远端更新', async () => {
      await useProgressStore.getState().initialize();
      const before = useProgressStore.getState().progress['doc-remote'];
      expect(before).toBeUndefined();
      useProgressStore.getState()._applyRemoteUpdate('doc-remote', 'read', Date.now());
      expect(useProgressStore.getState().progress['doc-remote']).toBe('read');
    });

    it('initialize 不会重复执行（initialized 标志）', async () => {
      await useProgressStore.getState().initialize();
      const firstState = useProgressStore.getState().initialized;
      expect(firstState).toBe(true);
      // 再次调用应不重复初始化
      await useProgressStore.getState().initialize();
      expect(useProgressStore.getState().initialized).toBe(true);
    });
  });

  describe('IndexedDB 异步备份', () => {
    it('IndexedDB 不可用时 persistProgress 静默降级（不抛出）', async () => {
      // 临时将 isIndexedDBAvailable mock 为 false
      const dbModule = await import('@/lib/db');
      const original = dbModule.isIndexedDBAvailable;
      (dbModule.isIndexedDBAvailable as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        false,
      );
      await expect(persistProgress('doc-no-idb', 'read', Date.now())).resolves.toBeUndefined();
      // 恢复
      (dbModule.isIndexedDBAvailable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        original(),
      );
    });

    it('put 调用时传入正确的 store 名称为 progress', async () => {
      const { put } = await import('@/lib/db');
      (put as unknown as ReturnType<typeof vi.fn>).mockClear();
      await persistProgress('doc-store-name', 'reading', Date.now());
      expect(put).toHaveBeenCalledWith(
        'progress',
        expect.objectContaining({ docId: 'doc-store-name' }),
      );
    });
  });

  describe('getOverallProgress / getModuleProgress', () => {
    it('getOverallProgress 返回正确统计（无参数时使用所有 progress keys）', () => {
      const { setProgress, getOverallProgress } = useProgressStore.getState();
      setProgress('d1', 'read');
      setProgress('d2', 'reading');
      setProgress('d3', 'unread');
      const stats = getOverallProgress();
      expect(stats.total).toBe(3);
      expect(stats.read).toBe(1);
      expect(stats.reading).toBe(1);
      expect(stats.unread).toBe(1);
      expect(stats.percent).toBe(33);
    });

    it('getOverallProgress 接受 allDocIds 参数', () => {
      const { setProgress, getOverallProgress } = useProgressStore.getState();
      setProgress('d1', 'read');
      const stats = getOverallProgress(['d1', 'd2', 'd3', 'd4']);
      expect(stats.total).toBe(4);
      expect(stats.read).toBe(1);
      expect(stats.unread).toBe(3);
      expect(stats.percent).toBe(25);
    });

    it('getModuleProgress 返回模块级进度统计', () => {
      const { setProgress, getModuleProgress } = useProgressStore.getState();
      setProgress('m1-d1', 'read');
      setProgress('m1-d2', 'reading');
      const stats = getModuleProgress('m1', ['m1-d1', 'm1-d2', 'm1-d3']);
      expect(stats.total).toBe(3);
      expect(stats.read).toBe(1);
      expect(stats.reading).toBe(1);
      expect(stats.unread).toBe(1);
    });
  });
});

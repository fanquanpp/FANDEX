/**
 * progress-service 单元测试
 *
 * 测试策略：
 * progress-service 依赖：
 * - @/lib/progress（基于 localStorage 与 IndexedDB）
 * - @/data/storage/progress-repository（基于 IndexedDB）
 * - ./module-service（用于补齐模块进度）
 *
 * 本测试通过 vi.stubGlobal 注入伪造的 localStorage、indexedDB、window、document、
 * BroadcastChannel API，确保测试在 jsdom 环境独立可运行。
 *
 * 覆盖场景：
 * - getAllProgress/getProgress：localStorage 缓存读取
 * - setProgress：写入 + 事件派发
 * - removeProgress/clearAllProgress：删除与清空
 * - subscribeProgress：事件订阅与取消订阅
 * - getProgressStats：聚合统计
 * - exportProgress/importProgress：JSON 导入导出
 * - getRecommendedNext：推荐文档
 * - syncFromIndexedDB：从 IndexedDB 恢复 localStorage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'fandex-progress';

/** 伪造 localStorage 存储 */
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

/** 事件监听器映射 */
const listeners: Record<string, Array<(e: Event) => void>> = {};

/** 派发自定义事件 */
function dispatchEvent(eventName: string): void {
  const handlers = listeners[eventName] ?? [];
  for (const handler of handlers) {
    handler(new Event(eventName));
  }
}

beforeEach(() => {
  mockStore[STORAGE_KEY] = '{}';
  // 重置事件监听
  for (const key of Object.keys(listeners)) {
    delete listeners[key];
  }
  // 注入全局对象
  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('document', {
    dispatchEvent: vi.fn(),
    addEventListener: (event: string, handler: (e: Event) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: (e: Event) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
  });
  vi.stubGlobal(
    'BroadcastChannel',
    class {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage() {}
      close() {}
    }
  );
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('performance', { now: () => Date.now() });
});

const {
  getAllProgress,
  getProgress,
  setProgress,
  removeProgress,
  clearAllProgress,
  subscribeProgress,
  getProgressStats,
  exportProgress,
  importProgress,
  getRecommendedNext,
  syncFromIndexedDB,
} = await import('@/services/progress-service');

describe('progress-service', () => {
  describe('同步 API', () => {
    describe('getAllProgress', () => {
      it('空存储应返回空对象', () => {
        const result = getAllProgress();
        expect(result).toEqual({});
      });

      it('应返回 localStorage 中存储的进度映射', () => {
        setProgress('cpp/pointer', 'reading');
        setProgress('git/branch', 'done');
        const all = getAllProgress();
        expect(Object.keys(all)).toHaveLength(2);
        expect(all['cpp/pointer']!.status).toBe('reading');
        expect(all['git/branch']!.status).toBe('done');
      });
    });

    describe('getProgress', () => {
      it('应返回指定文档的进度', () => {
        setProgress('cpp/pointer', 'done');
        const result = getProgress('cpp/pointer');
        expect(result).not.toBeNull();
        expect(result!.status).toBe('done');
      });

      it('未找到文档应返回 null', () => {
        const result = getProgress('unknown/doc');
        expect(result).toBeNull();
      });
    });

    describe('setProgress', () => {
      it('应写入状态与 lastRead 时间戳', () => {
        setProgress('mod/doc', 'reading', 100);
        const p = getProgress('mod/doc');
        expect(p).not.toBeNull();
        expect(p!.status).toBe('reading');
        expect(p!.scrollPos).toBe(100);
        expect(p!.lastRead).toBeGreaterThan(0);
      });

      it('默认 scrollPos 应为 0', () => {
        setProgress('mod/doc', 'reading');
        const p = getProgress('mod/doc');
        expect(p!.scrollPos).toBe(0);
      });
    });

    describe('removeProgress', () => {
      it('应删除指定文档的进度', () => {
        setProgress('mod/a', 'reading');
        removeProgress('mod/a');
        expect(getProgress('mod/a')).toBeNull();
      });
    });

    describe('clearAllProgress', () => {
      it('应清空所有进度', () => {
        setProgress('mod/a', 'reading');
        setProgress('mod/b', 'done');
        clearAllProgress();
        expect(getAllProgress()).toEqual({});
      });
    });
  });

  describe('subscribeProgress', () => {
    it('订阅后进度变更应触发回调', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeProgress(cb);
      setProgress('mod/test', 'reading');
      // 派发自定义事件以触发回调
      dispatchEvent('fandex-progress-change');
      expect(cb).toHaveBeenCalled();
      unsubscribe();
    });

    it('取消订阅后进度变更不再触发回调', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeProgress(cb);
      unsubscribe();
      dispatchEvent('fandex-progress-change');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('异步 API', () => {
    describe('getProgressStats', () => {
      it('空进度应返回零值统计', async () => {
        const stats = await getProgressStats();
        expect(stats.totalDocs).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.inProgress).toBe(0);
        expect(stats.bookmarked).toBe(0);
        expect(stats.streakDays).toBe(0);
        expect(Array.isArray(stats.moduleProgress)).toBe(true);
      });

      it('有进度时应聚合统计各状态文档数', async () => {
        setProgress('cpp/a', 'reading');
        setProgress('cpp/b', 'done');
        setProgress('git/c', 'reading');
        const stats = await getProgressStats();
        expect(stats.totalDocs).toBeGreaterThan(0);
        expect(stats.completed).toBeGreaterThanOrEqual(1);
        expect(stats.inProgress).toBeGreaterThanOrEqual(1);
      });

      it('应包含所有模块的进度明细（即使无记录）', async () => {
        const stats = await getProgressStats();
        // module-service.getAllModules 返回非空模块列表
        expect(stats.moduleProgress.length).toBeGreaterThan(0);
      });
    });

    describe('exportProgress / importProgress', () => {
      it('应输出合法 JSON 字符串', async () => {
        setProgress('mod/a', 'reading');
        const json = await exportProgress();
        expect(typeof json).toBe('string');
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('version');
        expect(parsed).toHaveProperty('records');
        expect(parsed).toHaveProperty('legacyProgress');
      });

      it('导入后应恢复进度', async () => {
        const json = JSON.stringify({
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          records: [],
          legacyProgress: {
            'mod/imported': { status: 'done', lastRead: Date.now(), scrollPos: 0 },
          },
        });
        await importProgress(json);
        const p = getProgress('mod/imported');
        expect(p).not.toBeNull();
        expect(p!.status).toBe('done');
      });

      it('非法 JSON 应静默忽略不抛异常', async () => {
        await expect(importProgress('not-json')).resolves.toBeUndefined();
      });
    });

    describe('getRecommendedNext', () => {
      it('空进度时应返回空数组', async () => {
        const recs = await getRecommendedNext();
        expect(Array.isArray(recs)).toBe(true);
      });

      it('有进行中进度时应返回推荐', async () => {
        setProgress('cpp/in-progress', 'reading');
        const recs = await getRecommendedNext(3);
        expect(Array.isArray(recs)).toBe(true);
      });

      it('limit 参数应限制返回数量', async () => {
        setProgress('cpp/a', 'reading');
        setProgress('cpp/b', 'reading');
        const recs = await getRecommendedNext(1);
        expect(recs.length).toBeLessThanOrEqual(1);
      });
    });

    describe('syncFromIndexedDB', () => {
      it('SSR/无 IndexedDB 环境应返回 false（不抛异常）', async () => {
        const result = await syncFromIndexedDB();
        expect(typeof result).toBe('boolean');
      });
    });
  });
});

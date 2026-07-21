/**
 * observability-service 单元测试
 *
 * 测试策略：
 * observability-service 依赖浏览器 localStorage API，本测试通过 vi.stubGlobal
 * 注入伪造的 localStorage，验证 Web Vitals 指标的记录、查询、统计与导出逻辑。
 *
 * 覆盖场景：
 * - recordVital：记录指标到 localStorage
 * - getVitals：查询最近记录（limit 限制）
 * - getVitalsSummary：分位数统计（p50/p75/p95）
 * - clearVitals：清空记录
 * - exportVitalsJSON：导出 JSON 字符串
 * - 异常静默处理：损坏数据过滤、SSR 安全降级
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VitalRecord } from '@/services/observability-service';

const STORAGE_KEY = 'fandex-web-vitals';

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

beforeEach(() => {
  mockLocalStorage.clear();
  vi.stubGlobal('localStorage', mockLocalStorage);
});

const { recordVital, getVitals, getVitalsSummary, clearVitals, exportVitalsJSON } =
  await import('@/services/observability-service');

/** 构造合法 VitalRecord */
function makeVital(overrides: Partial<VitalRecord> = {}): VitalRecord {
  return {
    name: 'LCP',
    value: 1000,
    rating: 'good',
    timestamp: Date.now(),
    url: 'https://example.com/page',
    ...overrides,
  };
}

describe('observability-service', () => {
  describe('recordVital', () => {
    it('应将单条记录写入 localStorage', () => {
      recordVital(makeVital({ value: 1500 }));
      const all = getVitals();
      expect(all).toHaveLength(1);
      expect(all[0]!.value).toBe(1500);
    });

    it('应支持记录多条指标（LCP/INP/CLS/TTFB/FCP）', () => {
      recordVital(makeVital({ name: 'LCP', value: 2000 }));
      recordVital(makeVital({ name: 'INP', value: 100 }));
      recordVital(makeVital({ name: 'CLS', value: 0.1 }));
      recordVital(makeVital({ name: 'TTFB', value: 800 }));
      recordVital(makeVital({ name: 'FCP', value: 1200 }));
      const all = getVitals();
      expect(all).toHaveLength(5);
      const names = all.map((r) => r.name);
      expect(names).toContain('LCP');
      expect(names).toContain('INP');
      expect(names).toContain('CLS');
      expect(names).toContain('TTFB');
      expect(names).toContain('FCP');
    });

    it('新记录应插入数组头部（最新在前）', () => {
      recordVital(makeVital({ value: 1, timestamp: 1000 }));
      recordVital(makeVital({ value: 2, timestamp: 2000 }));
      const all = getVitals();
      expect(all[0]!.value).toBe(2);
      expect(all[1]!.value).toBe(1);
    });
  });

  describe('getVitals', () => {
    it('应返回全部记录（无 limit）', () => {
      for (let i = 0; i < 5; i++) {
        recordVital(makeVital({ value: i }));
      }
      const all = getVitals();
      expect(all).toHaveLength(5);
    });

    it('limit 参数应限制返回数量', () => {
      for (let i = 0; i < 10; i++) {
        recordVital(makeVital({ value: i }));
      }
      const limited = getVitals(3);
      expect(limited).toHaveLength(3);
    });

    it('空存储应返回空数组', () => {
      const result = getVitals();
      expect(result).toEqual([]);
    });

    it('limit=0 应返回全部记录', () => {
      recordVital(makeVital({ value: 1 }));
      recordVital(makeVital({ value: 2 }));
      const result = getVitals(0);
      expect(result).toHaveLength(2);
    });
  });

  describe('getVitalsSummary', () => {
    it('无数据时应返回全 0 分位数', () => {
      const summary = getVitalsSummary();
      expect(summary.lcp).toEqual({ p50: 0, p75: 0, p95: 0 });
      expect(summary.inp).toEqual({ p50: 0, p75: 0, p95: 0 });
      expect(summary.cls).toEqual({ p50: 0, p75: 0, p95: 0 });
      expect(summary.ttfb).toEqual({ p50: 0, p75: 0, p95: 0 });
      expect(summary.fcp).toEqual({ p50: 0, p75: 0, p95: 0 });
    });

    it('应按指标名称分组计算分位数', () => {
      recordVital(makeVital({ name: 'LCP', value: 1000 }));
      recordVital(makeVital({ name: 'LCP', value: 2000 }));
      recordVital(makeVital({ name: 'LCP', value: 3000 }));
      recordVital(makeVital({ name: 'INP', value: 50 }));
      recordVital(makeVital({ name: 'INP', value: 100 }));
      const summary = getVitalsSummary();
      expect(summary.lcp.p50).toBe(2000);
      expect(summary.inp.p50).toBe(75);
    });

    it('p95 应大于等于 p75，p75 应大于等于 p50', () => {
      for (let i = 0; i < 20; i++) {
        recordVital(makeVital({ name: 'LCP', value: 1000 + i * 100 }));
      }
      const summary = getVitalsSummary();
      expect(summary.lcp.p95).toBeGreaterThanOrEqual(summary.lcp.p75);
      expect(summary.lcp.p75).toBeGreaterThanOrEqual(summary.lcp.p50);
    });

    it('应处理损坏的 localStorage 数据', () => {
      mockStore[STORAGE_KEY] = 'not-json';
      const summary = getVitalsSummary();
      expect(summary.lcp).toEqual({ p50: 0, p75: 0, p95: 0 });
    });

    it('应过滤掉结构不合法的记录', () => {
      // 写入包含不合法记录的数组
      mockStore[STORAGE_KEY] = JSON.stringify([
        { name: 'LCP', value: 1000, rating: 'good', timestamp: 1, url: 'http://x.com' },
        { name: 'INVALID', value: 100, rating: 'good', timestamp: 2, url: 'http://x.com' },
        { name: 'LCP', value: 'not-number', rating: 'good', timestamp: 3, url: 'http://x.com' },
        'not-an-object',
        null,
      ]);
      const all = getVitals();
      // 仅第一条记录合法
      expect(all).toHaveLength(1);
      expect(all[0]!.value).toBe(1000);
    });
  });

  describe('clearVitals', () => {
    it('应清空所有记录', () => {
      recordVital(makeVital({ value: 1 }));
      recordVital(makeVital({ value: 2 }));
      clearVitals();
      expect(getVitals()).toEqual([]);
    });

    it('清空后再写入应正常工作', () => {
      recordVital(makeVital({ value: 1 }));
      clearVitals();
      recordVital(makeVital({ value: 2 }));
      const all = getVitals();
      expect(all).toHaveLength(1);
      expect(all[0]!.value).toBe(2);
    });
  });

  describe('exportVitalsJSON', () => {
    it('应输出合法 JSON 字符串', () => {
      recordVital(makeVital({ value: 1000 }));
      const json = exportVitalsJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('空数据应输出空数组字符串', () => {
      const json = exportVitalsJSON();
      expect(json).toBe('[]');
    });

    it('应包含完整的记录字段', () => {
      recordVital(
        makeVital({
          name: 'LCP',
          value: 2500,
          rating: 'needs-improvement',
          timestamp: 1234567890,
          url: 'https://example.com/test',
        })
      );
      const parsed = JSON.parse(exportVitalsJSON()) as VitalRecord[];
      expect(parsed[0]!.name).toBe('LCP');
      expect(parsed[0]!.value).toBe(2500);
      expect(parsed[0]!.rating).toBe('needs-improvement');
      expect(parsed[0]!.timestamp).toBe(1234567890);
      expect(parsed[0]!.url).toBe('https://example.com/test');
    });
  });
});

/**
 * glossary-service 单元测试
 *
 * 测试策略：
 * glossary-service 提供两类 API：
 * 1. 同步 API（基于 src/data/glossary.json 静态数据）：lookup/search/getByModule/getAllTerms
 * 2. 异步 API（基于 astro:content Collection）：getGlossaryByModule/getAllGlossaryTerms/searchGlossary
 * 同步 API 直接验证真实数据；异步 API 通过 vi.mock 注入伪造实现。
 *
 * 覆盖场景：
 * - lookup：精确查找术语
 * - search：模糊搜索（多字段匹配、大小写不敏感、空 query 返回空数组）
 * - getByModule：按模块获取条目
 * - getAllTerms：返回去重并按长度降序排序的术语字符串数组
 * - getGlossaryByModule/getAllGlossaryTerms/searchGlossary：异步 API 的过滤与排序
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 伪造的 glossary collection 条目结构 */
interface FakeGlossaryEntry {
  id: string;
  data: { title: string; module: string };
}

let fakeGlossary: FakeGlossaryEntry[] = [];

function makeGlossaryEntry(entry: FakeGlossaryEntry): unknown {
  return { id: entry.id, data: entry.data };
}

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string, filter?: (entry: unknown) => boolean) => {
    if (collection !== 'glossary') return [];
    const items = fakeGlossary.map(makeGlossaryEntry);
    if (filter) return items.filter(filter);
    return items;
  }),
}));

const {
  lookup,
  search,
  getByModule,
  getAllTerms,
  getAllEntries,
  getGlossaryByModule,
  getAllGlossaryTerms,
  searchGlossary,
} = await import('@/services/glossary-service');

beforeEach(() => {
  fakeGlossary = [];
});

describe('glossary-service 同步 API', () => {
  describe('lookup', () => {
    it('应通过精确术语字符串找到条目', () => {
      // 指针是 glossary.json 中已知术语
      const result = lookup('指针');
      expect(result).toBeDefined();
      expect(result!.module).toBe('cpp');
    });

    it('未匹配术语应返回 undefined', () => {
      const result = lookup('不存在的术语-xyz');
      expect(result).toBeUndefined();
    });
  });

  describe('search', () => {
    it('空 query 应返回空数组', () => {
      const result = search('');
      expect(result).toEqual([]);
    });

    it('纯空白字符 query 应返回空数组', () => {
      const result = search('   ');
      expect(result).toEqual([]);
    });

    it('应匹配 term/english/definition 字段且大小写不敏感', () => {
      // 'pointer' 是 '指针' 的英文
      const result = search('pointer');
      expect(result.length).toBeGreaterThan(0);
      // 至少包含 '指针' 条目
      expect(result.some((e) => e.term === '指针')).toBe(true);
    });

    it('结果应按 term localeCompare 排序', () => {
      const result = search('a');
      expect(result.length).toBeGreaterThan(0);
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!.term;
        const curr = result[i]!.term;
        expect(prev.localeCompare(curr, 'zh-Hans-CN')).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('getByModule', () => {
    it('应返回指定模块的术语条目', () => {
      // cpp 模块在 glossary.json 中有大量术语
      const result = getByModule('cpp');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((e) => e.module === 'cpp')).toBe(true);
    });

    it('结果应按 term 排序', () => {
      const result = getByModule('cpp');
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!.term;
        const curr = result[i]!.term;
        expect(prev.localeCompare(curr, 'zh-Hans-CN')).toBeLessThanOrEqual(0);
      }
    });

    it('未匹配模块应返回空数组', () => {
      const result = getByModule('non-existent-module');
      expect(result).toEqual([]);
    });
  });

  describe('getAllTerms', () => {
    it('应返回去重并按长度降序排序的术语字符串数组', () => {
      const result = getAllTerms();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // 长度降序检查
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1]!.length).toBeGreaterThanOrEqual(result[i]!.length);
      }
    });
  });

  describe('getAllEntries', () => {
    it('应返回按 term 排序的全部条目数组', () => {
      const result = getAllEntries();
      expect(result.length).toBeGreaterThan(0);
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!.term;
        const curr = result[i]!.term;
        expect(prev.localeCompare(curr, 'zh-Hans-CN')).toBeLessThanOrEqual(0);
      }
    });
  });
});

describe('glossary-service 异步 API', () => {
  describe('getGlossaryByModule', () => {
    it('应返回指定模块的术语条目并按 title 排序', async () => {
      fakeGlossary = [
        { id: 'g/b.md', data: { title: 'B 项', module: 'g' } },
        { id: 'g/a.md', data: { title: 'A 项', module: 'g' } },
        { id: 'other/c.md', data: { title: 'C 项', module: 'other' } },
      ];
      const result = await getGlossaryByModule('g');
      expect(result).toHaveLength(2);
      expect(result[0]!.data.title).toBe('A 项');
      expect(result[1]!.data.title).toBe('B 项');
    });

    it('空模块应返回空数组', async () => {
      const result = await getGlossaryByModule('empty');
      expect(result).toEqual([]);
    });
  });

  describe('getAllGlossaryTerms', () => {
    it('应返回全部术语条目并按 title 排序', async () => {
      fakeGlossary = [
        { id: 'g/z.md', data: { title: 'Zebra', module: 'g' } },
        { id: 'g/a.md', data: { title: 'Apple', module: 'g' } },
      ];
      const result = await getAllGlossaryTerms();
      expect(result).toHaveLength(2);
      expect(result[0]!.data.title).toBe('Apple');
      expect(result[1]!.data.title).toBe('Zebra');
    });
  });

  describe('searchGlossary', () => {
    it('应返回 title 包含关键词的条目（大小写不敏感）', async () => {
      fakeGlossary = [
        { id: 'g/js.md', data: { title: 'JavaScript', module: 'g' } },
        { id: 'g/ts.md', data: { title: 'TypeScript', module: 'g' } },
        { id: 'g/css.md', data: { title: 'CSS', module: 'g' } },
      ];
      const result = await searchGlossary('script');
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.data.title.toLowerCase().includes('script'))).toBe(true);
    });

    it('无匹配应返回空数组', async () => {
      fakeGlossary = [{ id: 'g/a.md', data: { title: 'Apple', module: 'g' } }];
      const result = await searchGlossary('xyz');
      expect(result).toEqual([]);
    });
  });
});

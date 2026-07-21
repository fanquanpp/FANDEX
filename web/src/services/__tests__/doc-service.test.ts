/**
 * doc-service 单元测试
 *
 * 测试策略：
 * doc-service 依赖 astro:content 的 getCollection，本测试通过 vi.mock
 * 注入伪造的 getCollection 实现，模拟 docs Content Collection 的查询行为。
 *
 * 覆盖场景：
 * - getAllDocs：模块内文档排序、跨模块排序、异常返回空数组
 * - getDocsByModule：模块过滤与 order 排序
 * - getDocBySlug：精确匹配与未找到场景
 * - getDocNavigation：上下篇导航计算
 * - getDocStats：统计聚合（模块数、分类数、标签数）
 * - getDocsByCategory：分类过滤
 * - getRelatedDocs：关联文档查找（支持 slug 与完整路径两种引用格式）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 伪造的文档数据条目结构 */
interface FakeDocEntry {
  id: string;
  body: string;
  data: {
    title: string;
    module: string;
    order?: number;
    category?: string;
    tags: string[];
    difficulty?: string;
    related: string[];
    prerequisites: string[];
  };
}

/** 当前测试用例使用的伪造文档集合 */
let fakeDocs: FakeDocEntry[] = [];

/**
 * 构造伪造的 doc entry 对象
 * 仅包含测试所需的 data 字段，其余字段由 astro:content 类型补全
 */
function makeDoc(entry: FakeDocEntry): unknown {
  return {
    id: entry.id,
    body: entry.body,
    data: entry.data,
    render: async () => ({ Content: '' }),
  };
}

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string, filter?: (entry: unknown) => boolean) => {
    if (collection !== 'docs') return [];
    const docs = fakeDocs.map(makeDoc);
    if (filter) return docs.filter(filter);
    return docs;
  }),
}));

const {
  getAllDocs,
  getDocsByModule,
  getDocBySlug,
  getDocNavigation,
  getDocStats,
  getDocsByCategory,
  getRelatedDocs,
} = await import('@/services/doc-service');

beforeEach(() => {
  fakeDocs = [];
});

describe('doc-service', () => {
  describe('getAllDocs', () => {
    it('应按 module 字母序与 order 升序排序文档', async () => {
      fakeDocs = [
        {
          id: 'b/doc2.md',
          body: '',
          data: { title: 'B2', module: 'b', order: 2, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'a/doc2.md',
          body: '',
          data: { title: 'A2', module: 'a', order: 2, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'a/doc1.md',
          body: '',
          data: { title: 'A1', module: 'a', order: 1, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'b/doc1.md',
          body: '',
          data: { title: 'B1', module: 'b', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getAllDocs();
      expect(result).toHaveLength(4);
      expect(result[0]!.data.module).toBe('a');
      expect(result[0]!.data.order).toBe(1);
      expect(result[3]!.data.module).toBe('b');
      expect(result[3]!.data.order).toBe(2);
    });

    it('无 order 字段时应按 0 处理排序', async () => {
      fakeDocs = [
        {
          id: 'm/a.md',
          body: '',
          data: { title: 'A', module: 'm', tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'm/b.md',
          body: '',
          data: { title: 'B', module: 'm', order: 5, tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getAllDocs();
      // 无 order 视为 0，应排在 order=5 之前
      expect(result[0]!.data.title).toBe('A');
      expect(result[1]!.data.title).toBe('B');
    });

    it('空集合应返回空数组', async () => {
      const result = await getAllDocs();
      expect(result).toEqual([]);
    });
  });

  describe('getDocsByModule', () => {
    it('应仅返回指定模块的文档并按 order 升序', async () => {
      fakeDocs = [
        {
          id: 'a/2.md',
          body: '',
          data: { title: 'A2', module: 'a', order: 2, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'b/1.md',
          body: '',
          data: { title: 'B1', module: 'b', order: 1, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'a/1.md',
          body: '',
          data: { title: 'A1', module: 'a', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getDocsByModule('a');
      expect(result).toHaveLength(2);
      expect(result[0]!.data.title).toBe('A1');
      expect(result[1]!.data.title).toBe('A2');
    });

    it('未匹配模块应返回空数组', async () => {
      fakeDocs = [
        {
          id: 'a/1.md',
          body: '',
          data: { title: 'A1', module: 'a', tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getDocsByModule('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getDocBySlug', () => {
    it('应通过 slug 精确匹配文档', async () => {
      fakeDocs = [
        {
          id: 'a/hello-world.md',
          body: '',
          data: { title: 'Hello', module: 'a', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getDocBySlug('a', 'hello-world');
      expect(result).not.toBeNull();
      expect(result!.data.title).toBe('Hello');
    });

    it('未找到 slug 应返回 null', async () => {
      fakeDocs = [
        {
          id: 'a/exists.md',
          body: '',
          data: { title: 'E', module: 'a', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const result = await getDocBySlug('a', 'missing');
      expect(result).toBeNull();
    });
  });

  describe('getDocNavigation', () => {
    it('应正确计算首篇文档的导航（prev=null, next=下一篇）', async () => {
      fakeDocs = [
        {
          id: 'm/first.md',
          body: '',
          data: { title: 'F', module: 'm', order: 1, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'm/second.md',
          body: '',
          data: { title: 'S', module: 'm', order: 2, tags: [], related: [], prerequisites: [] },
        },
      ];
      const nav = await getDocNavigation('m', 'first');
      expect(nav.prev).toBeNull();
      expect(nav.next).not.toBeNull();
      expect(nav.next!.data.title).toBe('S');
    });

    it('未找到当前文档应返回 { prev: null, next: null }', async () => {
      fakeDocs = [
        {
          id: 'm/a.md',
          body: '',
          data: { title: 'A', module: 'm', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const nav = await getDocNavigation('m', 'missing');
      expect(nav).toEqual({ prev: null, next: null });
    });

    it('应正确计算末篇文档的导航（next=null, prev=上一篇）', async () => {
      fakeDocs = [
        {
          id: 'm/first.md',
          body: '',
          data: { title: 'F', module: 'm', order: 1, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'm/last.md',
          body: '',
          data: { title: 'L', module: 'm', order: 2, tags: [], related: [], prerequisites: [] },
        },
      ];
      const nav = await getDocNavigation('m', 'last');
      expect(nav.next).toBeNull();
      expect(nav.prev).not.toBeNull();
      expect(nav.prev!.data.title).toBe('F');
    });
  });

  describe('getDocStats', () => {
    it('应聚合统计文档总数、模块数、分类数与标签数', async () => {
      fakeDocs = [
        {
          id: 'a/1.md',
          body: '',
          data: {
            title: 'A1',
            module: 'a',
            order: 1,
            category: 'intro',
            tags: ['t1', 't2'],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'a/2.md',
          body: '',
          data: {
            title: 'A2',
            module: 'a',
            order: 2,
            category: 'intro',
            tags: ['t1'],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'b/1.md',
          body: '',
          data: {
            title: 'B1',
            module: 'b',
            order: 1,
            tags: ['t3'],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const stats = await getDocStats();
      expect(stats.totalDocs).toBe(3);
      expect(stats.totalModules).toBe(2);
      expect(stats.totalCategories).toBe(1);
      expect(stats.totalTags).toBe(3);
    });

    it('无文档时应返回全零统计', async () => {
      const stats = await getDocStats();
      expect(stats).toEqual({ totalDocs: 0, totalModules: 0, totalCategories: 0, totalTags: 0 });
    });
  });

  describe('getDocsByCategory', () => {
    it('应返回匹配分类的文档', async () => {
      fakeDocs = [
        {
          id: 'a/1.md',
          body: '',
          data: {
            title: 'A1',
            module: 'a',
            order: 1,
            category: 'intro',
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'b/1.md',
          body: '',
          data: {
            title: 'B1',
            module: 'b',
            order: 1,
            category: 'advanced',
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'c/1.md',
          body: '',
          data: {
            title: 'C1',
            module: 'c',
            order: 1,
            category: 'intro',
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const result = await getDocsByCategory('intro');
      expect(result).toHaveLength(2);
      expect(result.every((d) => d.data.category === 'intro')).toBe(true);
    });
  });

  describe('getRelatedDocs', () => {
    it('应基于 slug 字符串引用返回关联文档', async () => {
      fakeDocs = [
        {
          id: 'm/current.md',
          body: '',
          data: {
            title: 'Current',
            module: 'm',
            order: 1,
            tags: [],
            related: ['related-doc'],
            prerequisites: [],
          },
        },
        {
          id: 'm/related-doc.md',
          body: '',
          data: {
            title: 'Related',
            module: 'm',
            order: 2,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const result = await getRelatedDocs('m', 'current');
      expect(result).toHaveLength(1);
      expect(result[0]!.data.title).toBe('Related');
    });

    it('应基于完整路径引用返回关联文档', async () => {
      fakeDocs = [
        {
          id: 'm/current.md',
          body: '',
          data: {
            title: 'Current',
            module: 'm',
            order: 1,
            tags: [],
            related: ['other/cross'],
            prerequisites: [],
          },
        },
        {
          id: 'other/cross.md',
          body: '',
          data: {
            title: 'Cross',
            module: 'other',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const result = await getRelatedDocs('m', 'current');
      expect(result).toHaveLength(1);
      expect(result[0]!.data.title).toBe('Cross');
    });

    it('无关联字段时应返回空数组', async () => {
      fakeDocs = [
        {
          id: 'm/lonely.md',
          body: '',
          data: {
            title: 'Lonely',
            module: 'm',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const result = await getRelatedDocs('m', 'lonely');
      expect(result).toEqual([]);
    });
  });
});

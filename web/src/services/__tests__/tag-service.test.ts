/**
 * tag-service 单元测试
 *
 * 测试策略：
 * tag-service 依赖 astro:content 的 getCollection，本测试通过 vi.mock 注入
 * 伪造实现，验证标签聚合、过滤与统计逻辑。
 *
 * 覆盖场景：
 * - getAllTags：标签聚合与按 count 降序排序
 * - getDocsByTag：按标签过滤文档
 * - getTagStats：统计标签总数、文档总数、最大标签关联数
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 伪造的文档数据条目结构 */
interface FakeDocEntry {
  id: string;
  data: {
    title: string;
    module: string;
    order?: number;
    tags: string[];
  };
}

let fakeDocs: FakeDocEntry[] = [];

function makeDoc(entry: FakeDocEntry): unknown {
  return { id: entry.id, data: entry.data, body: '' };
}

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string, filter?: (entry: unknown) => boolean) => {
    if (collection !== 'docs') return [];
    const docs = fakeDocs.map(makeDoc);
    if (filter) return docs.filter(filter);
    return docs;
  }),
}));

const { getAllTags, getDocsByTag, getTagStats } = await import('@/services/tag-service');

beforeEach(() => {
  fakeDocs = [];
});

describe('tag-service', () => {
  describe('getAllTags', () => {
    it('应聚合所有标签并按文档数量降序排序', async () => {
      fakeDocs = [
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['common', 'rare'] } },
        { id: 'a/2.md', data: { title: 'A2', module: 'a', order: 2, tags: ['common'] } },
        { id: 'a/3.md', data: { title: 'A3', module: 'a', order: 3, tags: ['common', 'rare'] } },
      ];
      const tags = await getAllTags();
      // common 出现 3 次，rare 出现 2 次
      expect(tags).toHaveLength(2);
      expect(tags[0]!.tag).toBe('common');
      expect(tags[0]!.count).toBe(3);
      expect(tags[1]!.tag).toBe('rare');
      expect(tags[1]!.count).toBe(2);
    });

    it('空文档集合应返回空标签数组', async () => {
      const tags = await getAllTags();
      expect(tags).toEqual([]);
    });

    it('应处理文档无 tags 字段的场景', async () => {
      fakeDocs = [{ id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: [] } }];
      const tags = await getAllTags();
      expect(tags).toEqual([]);
    });

    it('相同标签应聚合为单一计数', async () => {
      fakeDocs = [
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['js', 'js'] } },
      ];
      const tags = await getAllTags();
      // 同一文档内重复标签应被计数（按 doc.data.tags 遍历）
      expect(tags.find((t) => t.tag === 'js')!.count).toBe(2);
    });
  });

  describe('getDocsByTag', () => {
    it('应返回包含指定标签的所有文档', async () => {
      fakeDocs = [
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['react'] } },
        { id: 'a/2.md', data: { title: 'A2', module: 'a', order: 2, tags: ['vue', 'react'] } },
        { id: 'a/3.md', data: { title: 'A3', module: 'a', order: 3, tags: ['vue'] } },
      ];
      const result = await getDocsByTag('react');
      expect(result).toHaveLength(2);
      expect(result.every((d) => d.data.tags.includes('react'))).toBe(true);
    });

    it('结果应按 order 升序排序', async () => {
      fakeDocs = [
        { id: 'a/2.md', data: { title: 'A2', module: 'a', order: 2, tags: ['x'] } },
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['x'] } },
      ];
      const result = await getDocsByTag('x');
      expect(result[0]!.data.order).toBe(1);
      expect(result[1]!.data.order).toBe(2);
    });

    it('未匹配标签应返回空数组', async () => {
      fakeDocs = [{ id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['x'] } }];
      const result = await getDocsByTag('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getTagStats', () => {
    it('应返回标签总数、文档总数与最大关联数', async () => {
      fakeDocs = [
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['common', 'rare'] } },
        { id: 'a/2.md', data: { title: 'A2', module: 'a', order: 2, tags: ['common'] } },
        { id: 'a/3.md', data: { title: 'A3', module: 'a', order: 3, tags: ['common', 'rare'] } },
      ];
      const stats = await getTagStats();
      expect(stats.totalTags).toBe(2);
      expect(stats.totalDocs).toBe(3);
      expect(stats.maxCount).toBe(3);
    });

    it('空集合应返回全零统计', async () => {
      const stats = await getTagStats();
      expect(stats).toEqual({ totalTags: 0, totalDocs: 0, maxCount: 0 });
    });

    it('单一标签时 maxCount 应等于文档数', async () => {
      fakeDocs = [
        { id: 'a/1.md', data: { title: 'A1', module: 'a', order: 1, tags: ['only'] } },
        { id: 'a/2.md', data: { title: 'A2', module: 'a', order: 2, tags: ['only'] } },
      ];
      const stats = await getTagStats();
      expect(stats.maxCount).toBe(2);
      expect(stats.totalTags).toBe(1);
    });
  });
});

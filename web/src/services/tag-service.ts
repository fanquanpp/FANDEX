/**
 * 标签服务模块
 * 封装文档标签的聚合、查询和统计逻辑
 *
 * 设计原则：
 * - 所有 getCollection 调用仅限本模块内部
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回安全默认值
 */
import { getCollection, type CollectionEntry } from 'astro:content';

/** 文档条目类型（从 Content Schema 推导） */
type DocEntry = CollectionEntry<'docs'>;

/** 标签与文档数量 */
interface TagWithCount {
  /** 标签名称 */
  tag: string;
  /** 包含该标签的文档数量 */
  count: number;
}

/** 标签统计信息 */
interface TagStats {
  /** 标签总数（去重） */
  totalTags: number;
  /** 文档总数 */
  totalDocs: number;
  /** 单个标签关联的最大文档数 */
  maxCount: number;
}

/**
 * 从所有文档中聚合标签，返回按文档数量降序排序的标签列表
 * 核心执行流程：
 *   1. 获取全部文档
 *   2. 遍历每篇文档的 tags 字段，统计每个标签出现次数
 *   3. 转为数组并按 count 降序排序
 * @returns { tag, count } 数组；异常时返回空数组
 */
export async function getAllTags(): Promise<TagWithCount[]> {
  try {
    const docs = await getCollection('docs');
    const tagMap = new Map<string, number>();
    docs.forEach((doc) => {
      doc.data.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

/**
 * 获取包含指定标签的所有文档
 * @param tag - 标签名称
 * @returns 匹配的文档数组（按 order 排序）；异常时返回空数组
 */
export async function getDocsByTag(tag: string): Promise<DocEntry[]> {
  try {
    const docs = await getCollection('docs', ({ data }) => data.tags.includes(tag));
    return docs.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  } catch {
    return [];
  }
}

/**
 * 获取标签统计信息
 * @returns 标签统计对象；异常时返回零值
 */
export async function getTagStats(): Promise<TagStats> {
  try {
    const docs = await getCollection('docs');
    const tagMap = new Map<string, number>();
    docs.forEach((doc) => {
      doc.data.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    const counts = Array.from(tagMap.values());
    return {
      totalTags: tagMap.size,
      totalDocs: docs.length,
      maxCount: counts.length > 0 ? Math.max(...counts) : 0,
    };
  } catch {
    return { totalTags: 0, totalDocs: 0, maxCount: 0 };
  }
}

export type { TagWithCount, TagStats };

/**
 * 术语表服务模块
 *
 * 设计原则：
 * - 同步 API（lookup/search/getByModule/getAllTerms）：基于 src/data/glossary.json 静态数据
 *   供 remark 插件（构建期）、TermTooltip 岛屿（运行期）、术语表页面（SSR）使用
 * - 异步 API（getGlossaryByModule/getAllGlossaryTerms/searchGlossary）：基于 Astro Content Collection
 *   供需要 markdown 正文渲染的术语表页面使用，向后兼容
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回安全默认值
 * - 不出现循环依赖：glossary.json 为静态数据，无任何反向引用
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { GlossaryEntry } from '@/types/glossary';
import glossaryData from '@/data/glossary.json';

// ============================================================
// 同步 API：基于静态 JSON 数据（构建期与运行期均可使用）
// ============================================================

/** 已加载的术语条目数组（来自 src/data/glossary.json，模块初始化时即就绪） */
const entries: readonly GlossaryEntry[] = Object.freeze(
  glossaryData.map((item) => ({ ...item }) as GlossaryEntry)
);

/** 术语 -> 条目 的快速查找映射（仅取首个匹配，避免重复术语导致歧义） */
const termLookupMap: ReadonlyMap<string, GlossaryEntry> = (() => {
  const map = new Map<string, GlossaryEntry>();
  for (const entry of entries) {
    if (!map.has(entry.term)) {
      map.set(entry.term, entry);
    }
  }
  return map;
})();

/** 模块 ID -> 条目数组 的分组映射（按术语 localeCompare 排序） */
const moduleGroupMap: ReadonlyMap<string, GlossaryEntry[]> = (() => {
  const map = new Map<string, GlossaryEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.module);
    if (list) {
      list.push(entry);
    } else {
      map.set(entry.module, [entry]);
    }
  }
  // 每个模块内部按 term 字符串排序
  for (const list of map.values()) {
    list.sort((a, b) => a.term.localeCompare(b.term, 'zh-Hans-CN'));
  }
  return map;
})();

/**
 * 精确查找指定术语的条目
 *
 * @param term - 待查找的术语字符串（精确匹配）
 * @returns 命中则返回 GlossaryEntry，未命中返回 undefined
 */
export function lookup(term: string): GlossaryEntry | undefined {
  return termLookupMap.get(term);
}

/**
 * 模糊搜索术语条目：匹配 term、english、definition 字段，不区分大小写
 *
 * @param query - 搜索关键词
 * @returns 命中条目数组，按 term localeCompare 排序；空 query 返回空数组
 */
export function search(query: string): GlossaryEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const lowerQuery = trimmed.toLowerCase();
  return entries
    .filter((entry) => {
      return (
        entry.term.toLowerCase().includes(lowerQuery) ||
        entry.english.toLowerCase().includes(lowerQuery) ||
        entry.definition.toLowerCase().includes(lowerQuery)
      );
    })
    .sort((a, b) => a.term.localeCompare(b.term, 'zh-Hans-CN'));
}

/**
 * 获取指定模块的全部术语条目
 *
 * @param moduleId - 模块 ID（如 'cpp'、'algorithm'）
 * @returns 该模块按 term 排序的条目数组；模块不存在返回空数组
 */
export function getByModule(module: string): GlossaryEntry[] {
  return moduleGroupMap.get(module) ?? [];
}

/**
 * 获取全部术语字符串数组（用于 remark 插件 Trie 构建与运行期识别）
 *
 * 返回数组已去重，按 term 长度降序排序（remark 插件依赖长词优先匹配避免短词截断）。
 *
 * @returns 去重后的术语字符串数组
 */
export function getAllTerms(): string[] {
  // termLookupMap 的键已天然去重
  return Array.from(termLookupMap.keys()).sort((a, b) => b.length - a.length);
}

/**
 * 获取全部术语条目（同步版本，供 SSR 与构建期使用）
 *
 * @returns 按 term localeCompare 排序的全部条目数组
 */
export function getAllEntries(): GlossaryEntry[] {
  return entries.slice().sort((a, b) => a.term.localeCompare(b.term, 'zh-Hans-CN'));
}

// ============================================================
// 异步 API：基于 Content Collection（向后兼容，供 glossary.astro 渲染 markdown 用）
// ============================================================

/** 术语条目类型（从 Content Schema 推导） */
type GlossaryCollectionEntry = CollectionEntry<'glossary'>;

/**
 * 获取指定模块的术语表（基于 Content Collection），按标题排序
 * @param moduleId - 模块 ID
 * @returns 按标题 localeCompare 排序后的术语条目数组；异常时返回空数组
 */
export async function getGlossaryByModule(moduleId: string): Promise<GlossaryCollectionEntry[]> {
  try {
    const glossary = await getCollection('glossary', ({ data }) => data.module === moduleId);
    return glossary.sort((a, b) => a.data.title.localeCompare(b.data.title));
  } catch {
    return [];
  }
}

/**
 * 获取所有术语条目（基于 Content Collection）
 * @returns 按标题排序的全部术语条目数组；异常时返回空数组
 */
export async function getAllGlossaryTerms(): Promise<GlossaryCollectionEntry[]> {
  try {
    const glossary = await getCollection('glossary');
    return glossary.sort((a, b) => a.data.title.localeCompare(b.data.title));
  } catch {
    return [];
  }
}

/**
 * 搜索术语条目（基于 Content Collection，按标题模糊匹配，不区分大小写）
 * @param query - 搜索关键词
 * @returns 标题包含关键词的术语条目数组（按标题排序）；异常时返回空数组
 */
export async function searchGlossary(query: string): Promise<GlossaryCollectionEntry[]> {
  try {
    const glossary = await getCollection('glossary');
    const lowerQuery = query.toLowerCase();
    return glossary
      .filter((item) => item.data.title.toLowerCase().includes(lowerQuery))
      .sort((a, b) => a.data.title.localeCompare(b.data.title));
  } catch {
    return [];
  }
}

export type { GlossaryEntry, GlossaryCollectionEntry };

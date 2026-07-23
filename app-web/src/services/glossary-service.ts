/**
 * 术语表服务模块
 *
 * 设计原则：
 * - 同步 API（lookup/search/getByModule/getAllTerms/getAllEntries）：基于 shd-shared/metadata/glossary/
 *   各模块 JSON 文件聚合加载，供 remark 插件（构建期）、TermTooltip 岛屿（运行期）、术语表页面（SSR）使用
 * - 异步 API（getGlossaryByModule/getAllGlossaryTerms/searchGlossary）：基于 Astro Content Collection
 *   供术语表页面获取分组结构化数据，向后兼容
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回安全默认值
 * - 不出现循环依赖：元数据为静态读取，无任何反向引用
 *
 * 偏差报备（仓库整理后数据源迁移）：
 * - 原：app-web/src/data/glossary.json（扁平数组，含 term/english/etymology/definition/module/references）
 * - 新：shd-shared/metadata/glossary/{module}.json（按模块分文件，含 moduleId/terms[{name,definition,slug}]）
 * - 迁移依据：三端架构统一后需共享单一元数据源，消除 app-web 硬编码数据
 * - 字段映射：name→term，definition→definition，moduleId→module，english 默认空串（新格式无此字段）
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { GlossaryEntry } from '@/types/glossary';
import { getModules, getGlossary } from '@fandex/utils/metadata';

// ============================================================
// 同步 API：基于 shd-shared/metadata/glossary/ 聚合加载（构建期与运行期均可使用）
// ============================================================

/**
 * 从 shd-shared/metadata/glossary/ 聚合加载全部模块的术语条目
 *
 * 核心执行流程：
 *   1. 通过 getModules() 获取全部模块列表
 *   2. 逐模块调用 getGlossary(moduleId) 读取 JSON 文件
 *   3. 将 { name, definition, slug, moduleId } 映射为 GlossaryEntry 结构
 *
 * @returns 聚合后的术语条目数组（已冻结）
 */
function loadAllGlossaryEntries(): GlossaryEntry[] {
  const moduleMetadata = getModules();
  if (!moduleMetadata) return [];

  const result: GlossaryEntry[] = [];
  for (const mod of moduleMetadata.modules) {
    const glossary = getGlossary(mod.id);
    if (!glossary) continue;
    for (const term of glossary.terms) {
      result.push({
        term: term.name,
        english: '',
        definition: term.definition,
        module: glossary.moduleId,
      });
    }
  }
  return result;
}

/** 已加载的术语条目数组（模块初始化时即就绪，从共享元数据聚合） */
const entries: readonly GlossaryEntry[] = Object.freeze(loadAllGlossaryEntries());

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
// 异步 API：基于 Content Collection（供 glossary.astro 渲染结构化术语表）
// ============================================================

/**
 * 术语集合条目类型
 *
 * 对应 shd-shared/metadata/glossary/{module}.json 的结构：
 * - data.moduleId：模块 ID
 * - data.terms：术语数组，每项含 { name, definition, slug }
 */
export type GlossaryCollectionEntry = CollectionEntry<'glossary'>;

/**
 * 获取指定模块的术语表集合条目
 *
 * 从 Content Collection 中过滤出 moduleId 匹配的条目。
 * 每个条目对应一个 shd-shared/metadata/glossary/{module}.json 文件，
 * 其 data.terms 数组包含该模块的全部术语。
 *
 * @param moduleId - 模块 ID
 * @returns 匹配的集合条目数组；异常时返回空数组
 */
export async function getGlossaryByModule(
  moduleId: string,
): Promise<GlossaryCollectionEntry[]> {
  try {
    const glossary = await getCollection('glossary', ({ data }) => data.moduleId === moduleId);
    return glossary;
  } catch {
    return [];
  }
}

/**
 * 获取所有术语表集合条目
 *
 * 返回 Content Collection 中的全部条目，每个条目对应一个模块的术语 JSON 文件。
 *
 * @returns 全部术语集合条目数组；异常时返回空数组
 */
export async function getAllGlossaryTerms(): Promise<GlossaryCollectionEntry[]> {
  try {
    return await getCollection('glossary');
  } catch {
    return [];
  }
}

/**
 * 搜索术语条目（基于 Content Collection，按术语名模糊匹配，不区分大小写）
 *
 * 遍历所有模块的 terms 数组，筛选 term.name 包含关键词的条目。
 *
 * @param query - 搜索关键词
 * @returns 包含匹配术语的集合条目数组；异常时返回空数组
 */
export async function searchGlossary(
  query: string,
): Promise<GlossaryCollectionEntry[]> {
  try {
    const glossary = await getCollection('glossary');
    const lowerQuery = query.toLowerCase();
    return glossary.filter((item) =>
      item.data.terms.some((term) => term.name.toLowerCase().includes(lowerQuery)),
    );
  } catch {
    return [];
  }
}

export type { GlossaryEntry, GlossaryCollectionEntry };

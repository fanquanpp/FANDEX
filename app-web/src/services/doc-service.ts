/**
 * 文档服务模块
 * 封装 docs Content Collection 的所有查询、排序、分组、过滤逻辑
 * 作为 UI 层与 Data 层（getCollection）之间的唯一桥梁
 *
 * 设计原则：
 * - 所有 getCollection 调用仅限本模块内部
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回安全默认值
 * - 类型从 Content Schema 推导，不手动重复定义
 *
 * dev 模式 OOM 优化：
 * - getDocStats() 读取预构建的 JSON 缓存（scripts/build-stats.mjs 生成），
 *   避免全量加载所有文档导致 dev 模式 OOM 崩溃
 * - build 模式下 JSON 缓存同样适用，性能优于原 getCollection 方案
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { docSlug } from '@/lib/modules';
// 阅读时长估算为纯函数工具，从 reading-time.ts 引入避免重复定义
import { computeReadingTime } from '@/lib/reading-time';
// 预构建的文档统计缓存（由 scripts/build-stats.mjs 生成，避免 dev 模式 OOM）
import docStatsCache from '@/data/doc-stats.json';
// 预构建的文档索引缓存（由 scripts/build-stats.mjs 生成，避免 dev 模式 OOM）
// 供侧边栏"全部模块"面板按模块分组渲染，替代运行时全量 getCollection('docs') 调用
import docIndexCache from '@/data/doc-index.json';

/** 文档条目类型（从 Content Schema 推导） */
type DocEntry = CollectionEntry<'docs'>;

/**
 * 构建期查询缓存（静态站点：同一构建进程内 collection 数据恒定，可安全复用）
 *
 * 背景：1700+ 篇文档逐页静态生成时，每页若各自调用 getCollection 全量过滤 + 排序，
 * 总代价为 O(页数 × 文档数)，是构建耗时的主要热点之一。
 * 缓存后每个模块只排序一次，getDocNavigation / Sidebar / [slug].astro 共享同一结果。
 * dev 模式下内容变更会使 astro:content 虚拟模块失效并沿依赖链重新加载本模块，缓存随之重置。
 */
const sortedByModuleCache = new Map<string, DocEntry[]>();
let allDocsCache: DocEntry[] | null = null;

/** 文档导航结果：上下篇文档 */
interface DocNavigation {
  /** 上一篇文档（按 order 排序），首篇时为 null */
  prev: DocEntry | null;
  /** 下一篇文档（按 order 排序），末篇时为 null */
  next: DocEntry | null;
}

/** 文档统计数据 */
interface DocStats {
  /** 文档总数 */
  totalDocs: number;
  /** 涉及的模块数 */
  totalModules: number;
  /** 涉及的分类数 */
  totalCategories: number;
}

/**
 * 文档索引项（轻量结构，供侧边栏分组渲染）
 *
 * 与 DocEntry 的区别：
 * - DocEntry 携带完整 CollectionEntry（含 body/render 等重字段），运行时全量加载易 OOM
 * - DocIndexItem 仅含侧边栏渲染所需的 4 个字段，源自预构建 JSON 缓存，零文档内容加载
 *
 * 字段与 build-stats.mjs 输出的 doc-index.json 一一对应：
 * - slug   文档 slug（等价于 web 端 docSlug(collectionEntry.id)）
 * - module 所属模块 ID（frontmatter.module）
 * - title  文档标题（frontmatter.title）
 * - order  排序权重（frontmatter.order，缺省 0）
 */
interface DocIndexItem {
  /** 文档 slug（用于构建路由 href：/{module}/{slug}/） */
  slug: string;
  /** 所属模块 ID */
  module: string;
  /** 文档标题 */
  title: string;
  /** 排序权重 */
  order: number;
}

/**
 * 获取全部文档，按模块名和 order 顺序排序
 * 排序规则：先按 module 字段字母序，再按 order 升序
 * @returns 排序后的文档数组；异常时返回空数组
 */
export async function getAllDocs(): Promise<DocEntry[]> {
  if (allDocsCache) return allDocsCache;
  try {
    const docs = await getCollection('docs');
    docs.sort((a, b) => {
      if (a.data.module !== b.data.module) {
        return a.data.module.localeCompare(b.data.module);
      }
      return (a.data.order || 0) - (b.data.order || 0);
    });
    allDocsCache = docs;
    return docs;
  } catch {
    return [];
  }
}

/**
 * 获取指定模块的所有文档，按 order 升序排序
 * @param moduleId - 模块 ID
 * @returns 排序后的文档数组；异常时返回空数组
 */
export async function getDocsByModule(moduleId: string): Promise<DocEntry[]> {
  const cached = sortedByModuleCache.get(moduleId);
  if (cached) return cached;
  try {
    const docs = await getCollection('docs', ({ data }) => data.module === moduleId);
    docs.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    sortedByModuleCache.set(moduleId, docs);
    return docs;
  } catch {
    return [];
  }
}

/**
 * 获取指定模块下指定 slug 的文档
 * @param moduleId - 模块 ID
 * @param slug - 文档 slug（文件名去除 .md 后缀）
 * @returns 匹配的文档；未找到或异常时返回 null
 */
export async function getDocBySlug(moduleId: string, slug: string): Promise<DocEntry | null> {
  try {
    const docs = await getDocsByModule(moduleId);
    return docs.find((doc) => docSlug(doc.id) === slug) || null;
  } catch {
    return null;
  }
}

/**
 * 获取文档的上下篇导航信息
 * 根据当前文档在模块文档列表（按 order 排序）中的位置计算前后文档
 * @param moduleId - 模块 ID
 * @param slug - 当前文档 slug
 * @returns 包含 prev 和 next 的导航对象；异常或未找到时返回 { prev: null, next: null }
 */
export async function getDocNavigation(moduleId: string, slug: string): Promise<DocNavigation> {
  try {
    const docs = await getDocsByModule(moduleId);
    const currentIndex = docs.findIndex((doc) => docSlug(doc.id) === slug);
    if (currentIndex < 0) return { prev: null, next: null };
    // 使用 ?? null 将可能的 undefined（来自 noUncheckedIndexedAccess）收窄为 null
    // 保证返回类型与 DocNavigation 接口（DocEntry | null）严格匹配
    const prev = currentIndex > 0 ? (docs[currentIndex - 1] ?? null) : null;
    const next = currentIndex < docs.length - 1 ? (docs[currentIndex + 1] ?? null) : null;
    return { prev, next };
  } catch {
    return { prev: null, next: null };
  }
}

/**
 * 获取文档统计数据
 * 统计文档总数、模块数、分类数和标签数
 *
 * 优化说明（dev 模式 OOM 修复）：
 * - 原实现调用 getCollection('docs') 全量加载所有文档，
 *   dev 模式下导致 12GB 堆内存 OOM
 * - 改为读取预构建的 JSON 缓存（scripts/build-stats.mjs 生成），
 *   零文档内容加载，dev 模式下首页不再 OOM
 * - JSON 缓存由 dev / build 脚本启动前自动运行 build-stats.mjs 生成
 *
 * @returns 文档统计对象；缓存不可用时返回零值
 */
export async function getDocStats(): Promise<DocStats> {
  try {
    // 直接返回预构建的统计缓存，避免 getCollection('docs') 全量加载
    return {
      totalDocs: docStatsCache.totalDocs,
      totalModules: docStatsCache.totalModules,
      totalCategories: docStatsCache.totalCategories,
    };
  } catch {
    return { totalDocs: 0, totalModules: 0, totalCategories: 0 };
  }
}

/**
 * 获取文档索引（轻量结构，源自预构建 JSON 缓存）
 *
 * 返回扁平的 DocIndexItem 数组，已按 module 字母序 + order 升序排序
 * （排序规则与 getAllDocs() 一致，保证数据源切换后侧边栏分组结果不变）。
 *
 * 供侧边栏"全部模块"面板等需要全量文档列表但不需文档正文的场景使用。
 *
 * 与 getAllDocs() 的核心区别：
 * - getAllDocs() 运行时调用 getCollection('docs') 全量加载所有文档
 *   （含 body/render 等重字段），dev 模式下导致 12GB 堆内存 OOM
 * - getDocsIndex() 读取静态 import 的预构建 JSON，仅含 4 个轻量字段，
 *   零文档内容加载，O(1) 内存占用，彻底消除 dev/build 模式 OOM 风险
 *
 * 同步函数说明：
 * - 数据源自 import 静态导入的 JSON（build-stats.mjs 生成），无运行时 IO，无需 async
 * - 与 doc-service 其他 async 函数风格不一致，但同步返回更高效且语义清晰
 * - 扩展预留点：若未来需要运行时动态校验 JSON 结构，可在函数内补充 zod 校验
 *
 * @returns 排序后的文档索引数组；缓存不可用时返回空数组
 */
export function getDocsIndex(): DocIndexItem[] {
  try {
    // docIndexCache 为静态 import 的 JSON，TS 默认推导为字面量类型联合
    // 此处通过 as 断言约束为 DocIndexItem[]，保证调用方类型安全
    // 数据源自可信的构建脚本输出，无需运行时 schema 校验
    return (docIndexCache as DocIndexItem[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * 按分类获取文档
 * @param categoryId - 分类 ID（对应 frontmatter 中的 category 字段）
 * @returns 匹配分类的文档数组（按 order 排序）；异常时返回空数组
 */
export type { DocEntry, DocNavigation, DocStats, DocIndexItem };
export { computeReadingTime, docSlug };

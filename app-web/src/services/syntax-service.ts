/**
 * 语法速览服务模块
 * -----------------------------------------------------------------------------
 * 职责：
 * - 读取预构建的语言索引（src/data/syntax-index.json，由 scripts/build-syntax.mjs 生成）
 * - 为语法速览页（/syntax/）提供语言列表与统计信息
 *
 * 数据拆分说明：
 * - 语言索引体积小（约 2KB），页面直接内嵌，首屏立即可渲染语言切换
 * - 各语言卡片按模块拆分到 public/syntax-data/<module>.json（约 80-210KB），
 *   由 SyntaxExplorer 岛在用户切换语言时按需 fetch，避免单页内嵌 2MB 数据
 *
 * 设计原则：与 doc-service 一致，UI 层禁止直接读取数据文件，
 * 必须通过本服务模块（或 services 统一入口）访问。
 */

// 预构建语言索引缓存（scripts/build-syntax.mjs 生成）
import syntaxIndexCache from '@/data/syntax-index.json';

/** 语法速览语言元数据 */
export interface SyntaxLanguage {
  /** 模块 ID（与全站模块体系一致，用于路由与配色） */
  id: string;
  /** 语言显示名称 */
  title: string;
  /** 模块图标（共享元数据，与首页模块卡片同款 2-4 字符标识） */
  icon: string;
  /** 分类主题色（用于徽标、卡片强调与切换态） */
  color: string;
  /** 语法点卡片总数 */
  count: number;
  /** 来源文档数（mobile 文档） */
  docCount: number;
}

/** 语言索引缓存结构 */
interface SyntaxIndexCache {
  version: number;
  languages: SyntaxLanguage[];
}

/** 语法速览统计信息 */
export interface SyntaxStats {
  /** 语言种类数 */
  totalLanguages: number;
  /** 语法点总数（各语言卡片数之和） */
  totalCards: number;
  /** 来源文档总数（各语言文档数之和） */
  totalDocs: number;
}

/**
 * 获取语法速览语言索引
 * @returns 语言索引对象；缓存不可用时返回空索引
 */
export function getSyntaxIndex(): SyntaxIndexCache {
  const cache = syntaxIndexCache as SyntaxIndexCache;
  return {
    version: cache.version ?? 1,
    languages: Array.isArray(cache.languages) ? cache.languages : [],
  };
}

/**
 * 获取语法速览语言列表
 * @returns 按构建脚本顺序排列的语言数组；缓存不可用时返回空数组
 */
export function getSyntaxLanguages(): SyntaxLanguage[] {
  return getSyntaxIndex().languages;
}

/**
 * 获取语法速览统计信息
 * 遍历语言索引汇总卡片数与文档数，避免维护冗余统计字段
 * @returns 统计对象；索引为空时返回零值
 */
export function getSyntaxStats(): SyntaxStats {
  const languages = getSyntaxLanguages();
  return {
    totalLanguages: languages.length,
    totalCards: languages.reduce((sum, lang) => sum + lang.count, 0),
    totalDocs: languages.reduce((sum, lang) => sum + lang.docCount, 0),
  };
}

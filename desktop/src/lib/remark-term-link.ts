/**
 * remark-term-link 插件（Phase 9）
 *
 * 功能概述：
 * - 识别 Markdown 中的 `[[term]]` 与 `[[term|显示文本]]` 语法
 * - 查询术语表（glossary）将术语转换为带 tooltip 的链接
 * - 转换为 `<a href="/glossary/{module}/#{anchor}" class="term-link"
 *    data-term="{term}" data-definition="{definition}">{displayText}</a>`
 * - 客户端配合 term-tooltip.ts 在 hover/click 时显示术语定义浮窗
 *
 * 语法示例：
 *   这里使用 [[DOM]] 进行操作，详见 [[事件循环]]。
 *   [[闭包|闭包（Closure）]] 是 JavaScript 的重要概念。
 *
 * 数据源：
 * - 默认从 apps/web/src/content/glossary/<module>/glossary.md 读取术语表
 * - 解析 markdown 表格（列：术语、英文、释义）
 * - 模块级缓存，构建一次后复用
 * - 支持通过 options.glossary 外部传入预构建的术语映射
 *
 * 匹配规则：
 * - 大小写不敏感：[[DOM]] 与 [[dom]] 匹配同一术语
 * - 显示保留原大小写：[[dom]] 显示为 "dom"
 * - 别名语法：[[DOM|文档对象模型]] 显示为 "文档对象模型"
 * - 未找到术语：保留原文本 `[[未知名词]]`，仅 console.warn
 *
 * 安全性：
 * - 跳过代码块、行内代码、链接内的术语标记
 * - 限制每篇文档最多标记 100 个术语（避免 HTML 膨胀）
 * - HTML 转义：术语名与定义均转义后嵌入属性
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Html, Node, Parent, Root, Text } from 'mdast';
import type { Plugin, Transformer } from 'unified';

/** 单条术语数据 */
export interface TermData {
  /** 术语原始名称（保留大小写） */
  originalTerm: string;
  /** 术语所属模块 ID（如 javascript、react） */
  module: string;
  /** 术语定义/释义 */
  definition: string;
  /** 术语页面 slug（如 /glossary/javascript/#dom） */
  slug: string;
}

/** 术语映射表类型（key 为小写术语名） */
export type GlossaryMap = Map<string, TermData>;

/** 插件配置选项 */
export interface RemarkTermLinkOptions {
  /** 预构建的术语映射表（外部传入时跳过文件读取） */
  glossary?: GlossaryMap;
  /** 项目根目录（用于定位 glossary 目录，默认推断） */
  baseDir?: string;
  /** 每篇文档最多标记术语数（默认 100） */
  maxMatches?: number;
}

/** 每篇文档最多标记的术语数量 */
const DEFAULT_MAX_MATCHES = 100;

/** `[[term]]` 与 `[[term|display]]` 语法正则 */
const TERM_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** glossary 目录相对于 web 项目根的路径 */
const _GLOSSARY_DIR_RELATIVE = 'src/content/glossary';

/**
 * 将文本 slugify 化为 URL 锚点
 *
 * 输入：DOM、闭包、Event Loop
 * 输出：dom、闭包、event-loop
 *
 * 规则：
 * - 转小写
 * - 空格替换为连字符
 * - 保留中文字符
 * - 移除特殊字符（保留字母、数字、中文、连字符）
 *
 * @param text - 原始文本
 * @returns slugified 文本
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * HTML 特殊字符转义（用于文本内容）
 *
 * @param str - 原始字符串
 * @returns 转义后的安全字符串
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * HTML 属性值转义（用于 data-* 属性）
 *
 * @param str - 原始字符串
 * @returns 转义后可安全用于 HTML 属性值的字符串
 */
function escapeAttr(str: string): string {
  return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 解析 YAML frontmatter 获取 module 字段
 *
 * 输入：glossary.md 文件内容
 * 输出：module 字段值；未找到返回空字符串
 *
 * @param content - markdown 文件内容
 * @returns module 字段值
 */
function parseFrontmatterModule(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) return '';

  const frontmatter = match[1];
  const moduleMatch = frontmatter.match(/^module:\s*['"]?([^'"\n\s]+)['"]?/m);
  return moduleMatch?.[1] ?? '';
}

/**
 * 解析 markdown 表格行，提取术语数据
 *
 * 输入：表格行 `| 闭包 | Closure | 函数与其引用的词法环境的组合... |`
 * 输出：{ term, english, definition } 或 null（非数据行）
 *
 * @param line - 表格行
 * @returns 术语数据或 null
 */
function parseTableRow(line: string): { term: string; english: string; definition: string } | null {
  const trimmed = line.trim();
  /* 表格行必须以 | 开头和结尾 */
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  /* 跳过分隔行（如 | --- | --- |） */
  if (/^\|[\s-:|]+\|$/.test(trimmed)) return null;

  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());

  /* 至少需要 3 列：术语、英文、释义 */
  if (cells.length < 3) return null;

  const [term, english, ...rest] = cells;
  if (!term || !english) return null;

  const definition = rest.join(' | ').trim();
  if (!definition) return null;

  return { term, english, definition };
}

/**
 * 从单个 glossary.md 文件构建术语条目
 *
 * 输入：文件路径、模块 ID
 * 输出：术语条目数组
 * 流程：解析 frontmatter 与表格，将每行转为 TermData
 *
 * @param filePath - glossary.md 文件绝对路径
 * @param module - 模块 ID
 * @returns 术语条目数组
 */
function parseGlossaryFile(filePath: string, module: string): Array<TermData> {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    console.warn(`[remark-term-link] 读取文件失败: ${filePath}`);
    return [];
  }

  const resolvedModule = parseFrontmatterModule(content) || module;
  const entries: Array<TermData> = [];

  /* 逐行解析表格行 */
  const lines = content.split('\n');
  for (const line of lines) {
    const parsed = parseTableRow(line);
    if (!parsed) continue;

    const { term, english, definition } = parsed;

    /* 中文术语条目 */
    entries.push({
      originalTerm: term,
      module: resolvedModule,
      definition,
      slug: `/glossary/${resolvedModule}/#${slugify(term)}`,
    });

    /* 英文术语条目（与中文同一术语但用英文匹配）
     * 仅当英文与中文不同时添加，避免重复 */
    if (english && english.toLowerCase() !== term.toLowerCase()) {
      entries.push({
        originalTerm: english,
        module: resolvedModule,
        definition,
        slug: `/glossary/${resolvedModule}/#${slugify(english)}`,
      });
    }
  }

  return entries;
}

/**
 * 从 glossary 目录构建术语映射表
 *
 * 输入：glossary 目录绝对路径
 * 输出：术语映射表（key 为小写术语名）
 * 流程：扫描目录下所有子目录的 glossary.md 文件，解析并合并
 *
 * @param glossaryDir - glossary 目录绝对路径
 * @returns 术语映射表
 */
function buildGlossaryMap(glossaryDir: string): GlossaryMap {
  const map: GlossaryMap = new Map();

  if (!existsSync(glossaryDir)) {
    console.warn(`[remark-term-link] glossary 目录不存在: ${glossaryDir}`);
    return map;
  }

  let moduleDirs: string[];
  try {
    moduleDirs = readdirSync(glossaryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    console.warn(`[remark-term-link] 读取 glossary 目录失败: ${glossaryDir}`);
    return map;
  }

  for (const moduleDir of moduleDirs) {
    const glossaryFile = join(glossaryDir, moduleDir, 'glossary.md');
    if (!existsSync(glossaryFile)) continue;

    const entries = parseGlossaryFile(glossaryFile, moduleDir);
    for (const entry of entries) {
      const key = entry.originalTerm.toLowerCase();
      /* 保留首次出现的术语（与 build-glossary-index.mjs 去重逻辑一致） */
      if (!map.has(key)) {
        map.set(key, entry);
      }
    }
  }

  return map;
}

/** 模块级缓存（同一进程内术语表构建一次） */
let cachedGlossary: GlossaryMap | null = null;

/** 缓存对应的 baseDir，避免不同 baseDir 命中错误缓存 */
let cachedBaseDir: string | null = null;

/**
 * 获取术语映射表（带缓存）
 *
 * 输入：项目根目录路径
 * 输出：术语映射表
 * 流程：首次调用时构建，后续直接返回缓存
 *
 * @param baseDir - 项目根目录路径
 * @returns 术语映射表
 */
function getGlossaryMap(baseDir: string): GlossaryMap {
  if (cachedGlossary && cachedBaseDir === baseDir) {
    return cachedGlossary;
  }

  cachedGlossary = buildGlossaryMap(baseDir);
  cachedBaseDir = baseDir;
  return cachedGlossary;
}

/**
 * 推断默认项目根目录
 *
 * 默认基于当前文件位置推断 web 项目根：
 * 当前文件位于 apps/web/src/lib/remark-term-link.ts
 * 推断 web 项目根为 ../../..
 *
 * @returns web 项目根目录绝对路径
 */
function inferDefaultBaseDir(): string {
  /* 兜底：使用 process.cwd() */
  return process.cwd();
}

/**
 * 构建 term-link HTML 节点
 *
 * 输入：术语数据、显示文本
 * 输出：MDAST html 节点
 *
 * @param data - 术语数据
 * @param displayText - 显示文本（来自别名或术语本身）
 * @returns MDAST html 节点
 */
function buildTermLinkHtml(data: TermData, displayText: string): Html {
  return {
    type: 'html',
    value:
      `<a href="${escapeAttr(data.slug)}" class="term-link" ` +
      `data-term="${escapeAttr(data.originalTerm)}" ` +
      `data-definition="${escapeAttr(data.definition)}" ` +
      `data-module="${escapeAttr(data.module)}" ` +
      `tabindex="0">` +
      `<abbr class="term-abbr" title="${escapeAttr(data.definition)}">` +
      escapeHtml(displayText) +
      `</abbr></a>`,
  };
}

/**
 * 处理单个文本节点中的 `[[term]]` 标记
 *
 * 输入：文本节点、术语映射表、当前匹配计数
 * 输出：替换节点列表（text + html 交替），或 null 表示无需替换
 * 流程：
 * 1. 用正则匹配所有 `[[term]]` 或 `[[term|display]]`
 * 2. 查询术语映射表（大小写不敏感）
 * 3. 找到则替换为 term-link html 节点
 * 4. 未找到则保留原文本（不替换）
 *
 * @param textNode - 待处理的文本节点
 * @param glossaryMap - 术语映射表
 * @param matchCount - 当前匹配计数（引用传递）
 * @param maxMatches - 最大匹配数
 * @returns 替换节点列表，或 null 表示无需替换
 */
function processTermLinksInText(
  textNode: Text,
  glossaryMap: GlossaryMap,
  matchCount: { value: number },
  maxMatches: number,
): Array<Text | Html> | null {
  const text = textNode.value;
  if (!text?.includes('[[')) return null;

  /* 重置正则状态 */
  TERM_LINK_REGEX.lastIndex = 0;

  const nodes: Array<Text | Html> = [];
  let lastIndex = 0;
  let hasMatch = false;

  // 显式 while 循环 + 重新赋值，避免在条件表达式中赋值（Biome noAssignInExpressions）
  let match: RegExpExecArray | null = TERM_LINK_REGEX.exec(text);
  while (match !== null) {
    if (matchCount.value >= maxMatches) break;

    const [fullMatch, termName, displayText] = match;
    if (!fullMatch || !termName) {
      match = TERM_LINK_REGEX.exec(text);
      continue;
    }

    const trimmedTerm = termName.trim();
    const lookupKey = trimmedTerm.toLowerCase();
    const data = glossaryMap.get(lookupKey);

    /* 匹配前的普通文本 */
    if (match.index > lastIndex) {
      nodes.push({
        type: 'text',
        value: text.substring(lastIndex, match.index),
      });
    }

    if (data) {
      /* 找到术语：替换为 term-link html 节点 */
      const display = (displayText ?? trimmedTerm).trim();
      nodes.push(buildTermLinkHtml(data, display));
      matchCount.value++;
      hasMatch = true;
    } else {
      /* 未找到术语：保留原文本 `[[term]]`，仅 console.warn */
      console.warn(`[remark-term-link] 术语未找到: ${trimmedTerm}`);
      nodes.push({
        type: 'text',
        value: fullMatch,
      });
    }

    lastIndex = match.index + fullMatch.length;
    // 推进到下一个匹配（避免在 while 条件中赋值）
    match = TERM_LINK_REGEX.exec(text);
  }

  if (!hasMatch) return null;

  /* 最后一个匹配后的普通文本 */
  if (lastIndex < text.length) {
    nodes.push({
      type: 'text',
      value: text.substring(lastIndex),
    });
  }

  return nodes;
}

/** 递归遍历上下文：跟踪当前是否在代码块/链接内 */
interface WalkContext {
  /** 是否在代码节点内（inlineCode / code） */
  inCode: boolean;
  /** 是否在链接节点内 */
  inLink: boolean;
}

/**
 * 递归遍历 MDAST 节点树，标记 `[[term]]` 语法
 *
 * 输入：节点子数组、遍历上下文、术语映射表、匹配计数
 * 输出：无（直接修改节点树）
 * 流程：
 * 1. 反向遍历子节点（避免 splice 导致索引偏移）
 * 2. 对文本节点：检查上下文，若允许则执行术语匹配
 * 3. 对容器节点：递归遍历其子节点，传递更新后的上下文
 *
 * @param children - 当前层级的子节点数组
 * @param ctx - 遍历上下文
 * @param glossaryMap - 术语映射表
 * @param matchCount - 当前匹配计数（引用传递）
 * @param maxMatches - 最大匹配数
 */
function walkAndMarkTerms(
  children: Node[],
  ctx: WalkContext,
  glossaryMap: GlossaryMap,
  matchCount: { value: number },
  maxMatches: number,
): void {
  /* 反向遍历，避免 splice 导致索引偏移 */
  for (let i = children.length - 1; i >= 0; i--) {
    if (matchCount.value >= maxMatches) return;

    const node = children[i];
    if (!node) continue;

    if (node.type === 'text') {
      /* 跳过代码块/链接内的文本 */
      if (ctx.inCode || ctx.inLink) continue;

      const textNode = node as Text;
      const replacements = processTermLinksInText(textNode, glossaryMap, matchCount, maxMatches);
      if (replacements && replacements.length > 0) {
        children.splice(i, 1, ...replacements);
      }
    } else if (node.type === 'code' || node.type === 'inlineCode') {
    } else if ('children' in node) {
      const parent = node as Parent;
      const childCtx: WalkContext = {
        inCode: ctx.inCode || node.type === 'code' || node.type === 'inlineCode',
        inLink: ctx.inLink || node.type === 'link',
      };
      walkAndMarkTerms(parent.children, childCtx, glossaryMap, matchCount, maxMatches);
    }
  }
}

/**
 * remark-term-link 插件入口（默认导出）
 *
 * 识别 `[[term]]` 与 `[[term|display]]` 语法，将匹配的术语转换为带 tooltip 的链接。
 *
 * 输入：可选配置 { glossary?, baseDir?, maxMatches? }
 * 输出：unified Transformer 函数
 * 流程：
 * 1. 加载或接收术语映射表
 * 2. 遍历 MDAST 文本节点，匹配 `[[term]]` 语法
 * 3. 将匹配到的术语替换为 term-link HTML 节点
 *
 * @param options - 插件配置
 * @returns unified Transformer 函数
 */
export function remarkTermLink(options?: RemarkTermLinkOptions): Transformer<Root> {
  const maxMatches = options?.maxMatches ?? DEFAULT_MAX_MATCHES;

  /* 获取术语映射表：优先使用外部传入，否则从文件系统构建 */
  let glossaryMap: GlossaryMap | null = options?.glossary ?? null;

  return (tree: Root): Root => {
    /* 延迟加载术语映射表（仅在第一次处理文档时） */
    if (!glossaryMap) {
      const baseDir = options?.baseDir ?? inferDefaultBaseDir();
      glossaryMap = getGlossaryMap(baseDir);
    }

    /* 术语表为空时直接返回 */
    if (glossaryMap.size === 0) {
      return tree;
    }

    const matchCount = { value: 0 };
    const ctx: WalkContext = { inCode: false, inLink: false };
    walkAndMarkTerms(tree.children, ctx, glossaryMap, matchCount, maxMatches);

    return tree;
  };
}

/**
 * 工厂函数：创建 remark-term-link 插件（unified Plugin 形式）
 *
 * @param options - 插件配置
 * @returns unified Plugin 函数
 */
export function createRemarkTermLink(options?: RemarkTermLinkOptions): Plugin<[], Root> {
  return (): Transformer<Root> => remarkTermLink(options);
}

/**
 * 显式构建并缓存术语映射表（供外部调用方使用）
 *
 * @param baseDir - 项目根目录路径
 * @returns 术语映射表
 */
export function buildGlossary(baseDir: string): GlossaryMap {
  return getGlossaryMap(baseDir);
}

/** 清除模块级缓存（测试用） */
export function clearGlossaryCache(): void {
  cachedGlossary = null;
  cachedBaseDir = null;
}

export default remarkTermLink;

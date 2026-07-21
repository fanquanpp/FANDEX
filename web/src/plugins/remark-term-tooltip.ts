/**
 * 术语提示 Markdown 解析插件（remark 插件）
 *
 * 功能概述：
 * 遍历 Markdown AST 中的 text 节点（paragraph、tableCell、heading、listItem 内），
 * 识别其中出现的术语表术语，将匹配到的术语包裹为带 data-term-tooltip 属性的
 * <span> 元素，供客户端脚本扫描并挂载 TermTooltip.vue 组件。
 *
 * 设计原则：
 * - 术语列表模块级缓存：初始化时一次性调用 getAllTerms()，避免每次 visit 重复构建
 * - 长词优先匹配：术语列表按长度降序排序，正则 alternation 优先匹配长术语，
 *   避免 "指针" 截断 "智能指针" 等场景
 * - 非消耗式边界：使用 lookbehind/lookahead 实现边界判定，避免边界字符被消耗
 *   导致相邻术语漏匹配（如 "指针，指针" 中的第二个 "指针"）
 * - 安全转义：术语内容经 HTML 转义后嵌入，避免 XSS 注入
 * - 类型严格：使用 mdast 类型定义，无 any/unknown，无 ts-ignore
 *
 * 输出 HTML 结构：
 *   <span data-term-tooltip data-term="指针">指针</span>
 *
 * 客户端扫描：
 *   扫描 [data-term-tooltip] 元素，使用 Vue createApp 动态挂载 TermTooltip.vue
 *
 * 偏差报备：
 *   原实现策略建议匹配模式 `(?:^|\W)(术语1|术语2|...)(?:$|\W)`（消耗式边界）。
 *   实测该模式在 "指针，指针" 等相邻术语场景下会因边界字符被消耗而漏匹配第二个术语，
 *   故改用 `(?<=^|\W)(?:术语1|术语2|...)(?=$|\W)`（非消耗式 lookbehind/lookahead）。
 *   变量宽度 lookbehind 在 Node 10+ (V8) 已支持，Astro 要求 Node 18+ 满足条件。
 */

import { visit } from 'unist-util-visit';
import type { Root, Text, Html } from 'mdast';
// 偏差报备：原计划通过 `import { getAllTerms } from '@/services/glossary-service'` 复用术语服务。
// 但 glossary-service.ts 顶部 `import { getCollection } from 'astro:content'` 在 astro.config.ts
// 加载阶段不可用（astro:content 是 Astro 运行时虚拟模块，仅在 Astro 上下文内可用）。
// astro.config.ts 在 Vite 启动早期加载 remark 插件，此时 astro:content 尚未注入，
// 导致 "Cannot find module '@/services/glossary-service'" 错误（实际为 astro:content 解析失败）。
// 依据：工具验证（npm run type-check 报错日志 typecheck-final.log）。
// 调整方案：直接 import 静态 JSON 数据，绕开 astro:content 依赖，仅在构建期消费只读数据。
import glossaryData from '../data/glossary.json';

/** 允许处理 text 子节点的父节点类型集合（跳过 link/code 等节点内的文本） */
const ALLOWED_PARENT_TYPES: ReadonlySet<string> = new Set([
  'paragraph',
  'tableCell',
  'heading',
  'listItem',
]);

/**
 * 模块初始化时一次性获取全部术语并缓存
 *
 * 直接从 src/data/glossary.json 静态数据提取 term 字段并去重。
 * 按 term 长度降序排序，保证正则 alternation 优先尝试长术语，避免短词截断长词
 * （如 "智能指针" 应优先于 "指针" 匹配）。
 * 过滤掉空字符串以防正则 alternation 出现空分支导致匹配空串。
 */
const TERM_LIST: readonly string[] = (() => {
  const seen = new Set<string>();
  for (const item of glossaryData) {
    const term = item?.term;
    if (typeof term === 'string' && term.length > 0) {
      seen.add(term);
    }
  }
  return Array.from(seen).sort((a, b) => b.length - a.length);
})();

/**
 * 术语匹配正则表达式（模块级缓存）
 *
 * 模式说明：
 *   (?<=^|\W)         - 前置边界（非消耗 lookbehind）：字符串开头或非单词字符
 *   (?:term1|term2|...) - 术语 alternation（已按长度降序，长词优先）
 *   (?=$|\W)          - 后置边界（非消耗 lookahead）：字符串结尾或非单词字符
 *
 * 边界规则说明：
 *   - \W = [^A-Za-z0-9_]，包含中文标点、中文汉字等所有非 ASCII 字母数字字符
 *   - 中文术语：前后为 \W 或字符串边界即匹配（满足"非字母数字字符或字符串边界"规则）
 *   - 英文术语：\W 边界等价于 \b 单词边界（如 "pointer" 不会匹配 "pointers" 中的前缀）
 *
 * 使用 lookbehind/lookahead 而非消耗式捕获组的原因：
 *   - 边界字符不被消耗，相邻术语可连续匹配（如 "指针，指针" 中的两个 "指针"）
 *   - 避免边界字符被前一个匹配消费后导致后一个匹配的边界判定失效
 */
const TERM_PATTERN: RegExp | null = (() => {
  if (TERM_LIST.length === 0) return null;
  const escaped = TERM_LIST.map(escapeRegex);
  return new RegExp(`(?<=^|\\W)(?:${escaped.join('|')})(?=$|\\W)`, 'g');
})();

/**
 * 转义正则表达式元字符，使字符串可作为字面量安全嵌入正则
 *
 * @param s - 原始字符串（可能包含 . * + ? ^ $ { } ( ) | [ ] \ 等元字符）
 * @returns 转义后的字符串（所有元字符前加反斜杠）
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * HTML 实体转义（防 XSS）
 *
 * 转义 5 个核心字符：& < > " '
 * 顺序重要：& 必须先转义，否则后续转义产生的 & 会被二次转义
 *
 * @param s - 原始字符串
 * @returns 转义后的 HTML 安全字符串
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 构建术语提示 span 的 HTML 字符串
 *
 * 生成的结构：
 *   <span data-term-tooltip data-term="术语">术语</span>
 *
 * - data-term-tooltip：布尔属性（无值），客户端脚本以此选择器扫描挂载点
 * - data-term：术语原文（经 HTML 转义），客户端脚本读取后查询术语详情
 *
 * @param term - 术语原文（已确保在术语表内）
 * @returns 带有 data-term-tooltip 属性的 span HTML 字符串
 */
function buildTermSpan(term: string): string {
  const escaped = escapeHtml(term);
  return `<span data-term-tooltip data-term="${escaped}">${escaped}</span>`;
}

/** 文本拆分后的子片段类型 */
interface TextSegment {
  /** 片段类型：text 为普通文本，html 为术语 span */
  type: 'text' | 'html';
  /** 片段内容（text 为原文片段，html 为 span HTML 字符串） */
  value: string;
}

/**
 * 将文本按术语匹配拆分为 text + html 交替的子片段序列
 *
 * 核心执行流程：
 *   1. 使用 String.prototype.matchAll 全局匹配所有术语出现位置
 *   2. 按匹配位置顺序，将原文本切分为：前导文本 + 术语 span + 文本 + 术语 span + ...
 *   3. 无任何匹配时返回 null，调用方可保留原 text 节点不做替换
 *
 * 边界处理说明：
 *   - lookbehind/lookahead 为零宽断言，match[0] 仅包含术语本身
 *   - matchAll 返回非重叠匹配，文本片段中不会再包含术语，避免递归替换
 *
 * @param value - 待拆分的原始文本
 * @param pattern - 术语匹配正则（带 g 标志）
 * @returns 拆分后的子片段数组；无匹配返回 null
 */
function splitTextByTerms(value: string, pattern: RegExp): TextSegment[] | null {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let matchFound = false;

  for (const match of value.matchAll(pattern)) {
    // match[0] 为匹配到的术语（lookbehind/lookahead 不消耗字符）
    // noUncheckedIndexedAccess 模式下 match[0] 类型为 string | undefined
    const term = match[0];
    if (term === undefined) continue;
    if (match.index === undefined) continue;

    matchFound = true;
    const termStart = match.index;
    const termEnd = termStart + term.length;

    // 推入前导普通文本（termStart > lastIndex 表示存在非术语文本）
    if (termStart > lastIndex) {
      segments.push({
        type: 'text',
        value: value.slice(lastIndex, termStart),
      });
    }

    // 推入术语 span（HTML 节点）
    segments.push({
      type: 'html',
      value: buildTermSpan(term),
    });

    lastIndex = termEnd;
  }

  // 无任何匹配，返回 null 信号，调用方保留原节点
  if (!matchFound) return null;

  // 推入尾部普通文本（最后一条术语之后剩余的文本）
  if (lastIndex < value.length) {
    segments.push({
      type: 'text',
      value: value.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * remark-term-tooltip 插件工厂函数
 *
 * 核心执行流程：
 *   1. 检查术语正则是否就绪，未就绪（术语表为空）直接返回无操作插件
 *   2. 遍历 MDAST 中所有 text 节点
 *   3. 仅处理 paragraph/tableCell/heading/listItem 直接子级的 text 节点
 *      （跳过 link、linkReference、strong、emphasis 等节点内的文本）
 *   4. 调用 splitTextByTerms 将文本按术语拆分为 text + html 交替序列
 *   5. 用多个子节点（Text | Html）替换原 text 节点
 *
 * 安全性说明：
 *   - 插入的新 text 节点不会再包含术语（matchAll 已提取全部非重叠匹配）
 *   - 因此 visit 重新访问这些 text 节点时 splitTextByTerms 返回 null，不会递归替换
 *   - 术语原文经 escapeHtml 转义后嵌入，避免 XSS 注入
 *
 * 父节点类型检查说明：
 *   - listItem 的直接子节点类型上不允许为 text（MDAST 规范要求 BlockContent），
 *     但保留 'listItem' 在允许集合中以兼容宽松解析器输出，无副作用
 *
 * @returns remark 插件函数，接收 Root 树并就地变换
 */
export function remarkTermTooltip() {
  return (tree: Root): void => {
    // 术语表为空时直接返回，避免无意义遍历
    if (TERM_PATTERN === null) return;

    visit(tree, 'text', (node: Text, index, parent) => {
      // 跳过无父节点或无索引的节点（理论上不会发生，TS 类型保护）
      if (!parent || typeof index !== 'number') return;

      // 仅处理允许的父节点类型内的 text，跳过 link/code/strong 等节点内的文本
      if (!ALLOWED_PARENT_TYPES.has(parent.type)) return;

      // 空文本无需处理
      if (node.value.length === 0) return;

      // 拆分文本为 text + html 子片段序列
      const segments = splitTextByTerms(node.value, TERM_PATTERN);
      // 无匹配则保留原节点
      if (segments === null) return;

      // 将子片段转换为 mdast 节点（Text | Html 交替）
      const newNodes: Array<Text | Html> = segments.map((seg): Text | Html =>
        seg.type === 'text'
          ? { type: 'text', value: seg.value }
          : { type: 'html', value: seg.value }
      );

      // 用多个新节点替换原 text 节点（splice 展开）
      // visit 会继续从 index+1 访问，新插入的 text 节点即使被重访也无匹配，安全
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

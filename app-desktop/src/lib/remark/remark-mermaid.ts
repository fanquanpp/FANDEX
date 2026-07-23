/**
 * remark-mermaid 插件（Phase 9）
 *
 * 功能概述：
 * - 在 Markdown 构建时将 ```mermaid 代码块预渲染为内联 SVG
 * - 消除客户端 Mermaid JS 依赖（约 200KB+ 运行时）
 * - 支持亮色（default）/ 暗色（dark）/ 中性（neutral）三种主题
 * - 渲染失败时回退为原始 <pre><code> 代码块 + 警告注释
 *
 * 语法示例：
 *   ```mermaid
 *   graph TD
 *     A --> B
 *   ```
 *
 * SSR 安全：
 * - Mermaid v11 依赖 DOM API（DOMPurify、SVG getBBox 等），Node.js 环境需 polyfill
 * - 采用双 DOM 环境方案（参考 isomorphic-mermaid）：
 *   1. jsdom 提供 DOMPurify 所需的完整 DOM API（TreeWalker 等）
 *   2. svgdom 提供 Mermaid 渲染所需的 SVG API（getBBox、getBoundingClientRect）
 *   3. CSSStyleSheet polyfill（Mermaid v11 依赖）
 * - 使用 createRequire 加载 CommonMain 模块，绕过 Vite SSR Module Runner
 *
 * 主题策略：
 * - 默认 'neutral'（中性主题，亮/暗模式均可读）
 * - 通过 CSS 变量与 data-theme 属性可实现客户端主题切换
 *
 * 设计要点：
 * - mermaid 模块延迟加载（无 mermaid 代码块时不加载）
 * - 全局渲染计数器确保 SVG ID 唯一
 * - 渲染后清理 DOM 残留元素
 * - 顺序渲染避免并发 DOM 环境冲突
 */

import { createRequire } from 'node:module';
import type { Code, Html, Parent, Root } from 'mdast';
import type { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';

/** 使用 Node.js 原生 require 加载模块，绕过 Vite SSR Module Runner */
const nodeRequire = createRequire(import.meta.url);

/** 全局渲染计数器，确保 Mermaid 图表 SVG ID 全局唯一 */
let globalCounter = 0;

/** 标记 CSSStyleSheet polyfill 是否已安装 */
let polyfillInstalled = false;

/** Mermaid 主题类型 */
export type MermaidTheme = 'default' | 'dark' | 'neutral';

/** 插件配置选项 */
export interface RemarkMermaidOptions {
  /** 渲染主题（默认 'neutral'） */
  theme?: MermaidTheme;
}

/** 工厂函数配置选项（与 RemarkMermaidOptions 等价，但语义更明确） */
export type CreateRemarkMermaidOptions = RemarkMermaidOptions;

/**
 * CSSStyleSheet 最小化 polyfill
 *
 * Mermaid v11 使用 CSSStyleSheet API（new CSSStyleSheet()、insertRule、cssRules、replaceSync），
 * 但 jsdom/svgdom 不支持该 API。此 polyfill 提供最小化实现，使 Mermaid 可以在 Node.js 环境中渲染。
 */
class CSSRulePolyfill {
  /** 规则文本 */
  cssText: string;

  constructor(cssText: string) {
    this.cssText = cssText;
  }
}

class CSSStyleSheetPolyfill {
  /** 规则列表 */
  cssRules: CSSRulePolyfill[];

  constructor() {
    this.cssRules = [];
  }

  /**
   * 插入 CSS 规则
   *
   * @param rule - CSS 规则文本
   * @param index - 插入位置
   * @returns 插入位置的索引
   */
  insertRule(rule: string, index: number): number {
    const normalizedIndex = Math.min(index, this.cssRules.length);
    this.cssRules.splice(normalizedIndex, 0, new CSSRulePolyfill(rule));
    return normalizedIndex;
  }

  /**
   * 批量替换 CSS 规则
   *
   * @param cssText - 完整 CSS 文本
   */
  replaceSync(cssText: string): void {
    const rules = cssText
      .split('}')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => `${r}}`);
    this.cssRules = rules.map((r) => new CSSRulePolyfill(r));
  }
}

/**
 * 安装 CSSStyleSheet 全局 polyfill
 *
 * 在全局注入 CSSStyleSheet 构造函数，使 Mermaid v11 可以在 Node.js 环境中渲染。
 * 仅在 CSSStyleSheet 未定义时安装，避免覆盖浏览器环境。
 */
function installCSSStyleSheetPolyfill(): void {
  if (polyfillInstalled) return;
  if (typeof globalThis.CSSStyleSheet === 'undefined') {
    (globalThis as Record<string, unknown>).CSSStyleSheet = CSSStyleSheetPolyfill;
  }
  polyfillInstalled = true;
}

/** 全局对象扩展类型（用于访问注入的 DOM 环境） */
type GlobalWithOptionalDom = typeof globalThis & {
  document?: Document;
  window?: Window & typeof globalThis;
};

/** mermaid 模块类型（仅声明需要的接口） */
interface MermaidApi {
  initialize(config: MermaidConfig): void;
  render(id: string, code: string): Promise<{ svg: string }>;
}

/** mermaid 初始化配置 */
interface MermaidConfig {
  startOnLoad: boolean;
  securityLevel: 'strict' | 'loose';
  theme: MermaidTheme;
  htmlLabels?: boolean;
  flowchart?: { htmlLabels?: boolean };
}

/** mermaid 模块缓存（延迟加载，避免无 mermaid 代码块时的不必要开销） */
let cachedMermaid: MermaidApi | null = null;

/** 标记 Mermaid 环境是否已初始化 */
let environmentInitialized = false;

/**
 * 初始化 Mermaid 渲染所需的 Node.js 环境
 *
 * Mermaid v11 的 ESM 依赖链需要两类浏览器环境 API：
 * - DOMPurify：需要完整的 DOM API（TreeWalker 等），jsdom 提供
 * - SVG 渲染：需要 SVG API（getBBox、getBoundingClientRect 等），svgdom 提供
 *
 * 双 DOM 环境方案（参考 isomorphic-mermaid）：
 * 1. 使用 jsdom 创建 window 传给 DOMPurify 初始化
 * 2. 将 DOMPurify 实例的 sanitize 方法复制到全局 DOMPurify 对象
 * 3. 使用 svgdom 创建全局 window/document（Mermaid 渲染使用）
 * 4. 安装 CSSStyleSheet polyfill
 * 5. 加载 Mermaid（此时 DOMPurify 和 SVG 环境均可用）
 *
 * @returns Mermaid API 实例，加载失败返回 null
 */
function initializeMermaidEnvironment(): MermaidApi | null {
  if (cachedMermaid) {
    return cachedMermaid;
  }

  if (!environmentInitialized) {
    try {
      /* 步骤 1：使用 jsdom 初始化 DOMPurify */
      const jsdomMod = nodeRequire('jsdom');
      const JSDOM = jsdomMod.JSDOM;
      const jsdomWindow = new JSDOM('').window;

      const dompurifyMod = nodeRequire('dompurify');
      const createDOMPurify = dompurifyMod.default || dompurifyMod;
      const DOMPurifyInstance = createDOMPurify(jsdomWindow);

      /*
       * 步骤 2：将 DOMPurify 实例的方法复制到工厂函数上
       * Mermaid 的 ESM 导入 `import DOMPurify from "dompurify"` 得到的是工厂函数，
       * 它在 Node.js 中不支持 sanitize。通过 Object.assign 将实例方法复制过去，
       * 使 Mermaid 调用 DOMPurify.sanitize() 时实际调用 jsdom 初始化的实例方法。
       */
      Object.assign(createDOMPurify, DOMPurifyInstance);

      /* 步骤 3：使用 svgdom 创建全局 SVG 兼容 DOM 环境 */
      const svgdomMod = nodeRequire('svgdom');
      const { createHTMLWindow } = svgdomMod;
      const svgWindow = createHTMLWindow();

      Object.assign(globalThis, {
        window: svgWindow,
        document: svgWindow.document,
      });

      /* 步骤 4：安装 CSSStyleSheet polyfill */
      installCSSStyleSheetPolyfill();

      environmentInitialized = true;
    } catch (error) {
      console.warn('[remark-mermaid] 环境初始化失败:', error);
      return null;
    }
  }

  /* 步骤 5：加载 Mermaid（此时全局环境已就绪） */
  try {
    const mod = nodeRequire('mermaid');
    cachedMermaid = (mod.default || mod) as MermaidApi;
    return cachedMermaid;
  } catch (error) {
    console.warn('[remark-mermaid] 无法加载 mermaid 依赖:', error);
    return null;
  }
}

/**
 * HTML 特殊字符转义
 *
 * @param str - 原始字符串
 * @returns 转义后的安全字符串，防止 XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Mermaid 单主题渲染结果 */
export interface MermaidRenderResult {
  /** 渲染后的 SVG 字符串 */
  svg: string;
  /** 渲染主题 */
  theme: MermaidTheme;
}

/**
 * 渲染 Mermaid 代码为指定主题的 SVG
 *
 * 输入：Mermaid 代码字符串、基础 ID、主题
 * 输出：渲染结果 { svg, theme }，失败返回 null
 * 流程：
 * 1. 初始化 Mermaid 渲染环境（双 DOM 环境方案）
 * 2. 以指定主题初始化 Mermaid
 * 3. 调用 render 异步渲染 SVG
 * 4. 清理渲染产生的 DOM 残留元素
 *
 * 注意：
 * - htmlLabels 必须设为 false，因为 svgdom 不支持 HTML foreignObject 的 getBoundingClientRect
 * - securityLevel 设为 'strict' 防止 XSS
 *
 * @param code - Mermaid 图表代码
 * @param baseId - 基础 ID（用于生成唯一 SVG 元素 ID）
 * @param theme - 渲染主题
 * @returns 渲染结果，失败时返回 null
 */
export async function renderMermaidSvg(
  code: string,
  baseId: string,
  theme: MermaidTheme = 'neutral',
): Promise<MermaidRenderResult | null> {
  const mermaidApi = initializeMermaidEnvironment();
  if (!mermaidApi) {
    return null;
  }

  try {
    mermaidApi.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme,
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });

    const { svg } = await mermaidApi.render(`${baseId}-${theme}`, code);

    /* 清理 DOM 中上一次渲染的残留元素 */
    const document = (globalThis as GlobalWithOptionalDom).document;
    if (document) {
      const container = document.getElementById(`d${baseId}-${theme}`);
      if (container) container.remove();
    }

    return { svg, theme };
  } catch (renderError) {
    console.warn(`[remark-mermaid] 渲染失败 (${baseId}):`, renderError);
    return null;
  }
}

/**
 * 构建渲染失败的回退 HTML 节点
 *
 * 渲染失败时保留原始 Mermaid 代码文本，便于用户排查语法错误。
 * 输出：<div class="mermaid-error">警告 + <pre><code>原始代码</code></pre></div>
 *
 * @param code - 原始 Mermaid 代码
 * @returns HTML 节点
 */
function buildFallbackHtml(code: string): Html {
  return {
    type: 'html',
    value: [
      '<div class="mermaid-error" role="alert">',
      '<!-- remark-mermaid: 渲染失败，回退为原始代码 -->',
      '<p><strong>Mermaid 渲染失败</strong>，原始代码如下：</p>',
      `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`,
      '</div>',
    ].join(''),
  };
}

/**
 * 构建渲染成功的 HTML 节点
 *
 * 输出：<div class="mermaid-svg" data-theme="{theme}">{svg}</div>
 * 通过 data-theme 属性支持 CSS 主题切换。
 *
 * @param result - 渲染结果
 * @returns HTML 节点
 */
function buildSuccessHtml(result: MermaidRenderResult): Html {
  return {
    type: 'html',
    value: `<div class="mermaid-svg" data-theme="${result.theme}">${result.svg}</div>`,
  };
}

/**
 * 收集 MDAST 中所有 mermaid 代码块
 *
 * 输入：MDAST 根节点
 * 输出：mermaid 代码块信息数组 { node, index, parent }
 *
 * @param tree - MDAST 根节点
 * @returns mermaid 代码块信息数组
 */
function collectMermaidBlocks(tree: Root): Array<{ node: Code; index: number; parent: Parent }> {
  const blocks: Array<{ node: Code; index: number; parent: Parent }> = [];

  visit(tree, 'code', (node: Code, index: number | undefined, parent: Parent | undefined) => {
    if (node.lang !== 'mermaid') return;
    if (index === undefined || parent === undefined) return;
    blocks.push({ node, index, parent });
  });

  return blocks;
}

/**
 * remark-mermaid 插件入口（默认导出）
 *
 * 在构建时将 Mermaid 代码块预渲染为 SVG，消除客户端 Mermaid JS 依赖。
 *
 * 输入：可选配置 { theme?: 'default' | 'dark' | 'neutral' }
 * 输出：unified Transformer 函数
 * 流程：
 * 1. 遍历 AST 收集所有 mermaid 代码块
 * 2. 逐个渲染为 SVG（顺序执行，避免并发 DOM 环境冲突）
 * 3. 替换代码块为 HTML 节点
 * 4. 渲染失败时保留原始代码文本作为回退
 *
 * @param options - 插件配置
 * @returns unified Transformer 函数
 */
export function remarkMermaid(options?: RemarkMermaidOptions): Transformer<Root> {
  const theme: MermaidTheme = options?.theme ?? 'neutral';

  return async (tree: Root): Promise<Root> => {
    const mermaidBlocks = collectMermaidBlocks(tree);

    /* 没有 mermaid 代码块则跳过 */
    if (mermaidBlocks.length === 0) return tree;

    /* 逐个渲染 mermaid 代码块（顺序执行，避免并发 DOM 环境冲突） */
    for (const block of mermaidBlocks) {
      const { node, index, parent } = block;
      const code = node.value;
      const baseId = `mermaid-svg-${globalCounter++}`;

      const result = await renderMermaidSvg(code, baseId, theme);

      const htmlNode = result ? buildSuccessHtml(result) : buildFallbackHtml(code);

      parent.children.splice(index, 1, htmlNode);
    }

    return tree;
  };
}

/**
 * 工厂函数：创建 remark-mermaid 插件（unified Plugin 形式）
 *
 * 与默认导出的 remarkMermaid 区别：
 * - remarkMermaid(options?) 直接返回 Transformer（用于 astro.config.ts 直接调用）
 * - createRemarkMermaid(options?) 返回 Plugin<[], Root>（用于 unified pipeline 注册）
 *
 * @param options - 插件配置
 * @returns unified Plugin 函数
 */
export function createRemarkMermaid(options?: CreateRemarkMermaidOptions): Plugin<[], Root> {
  return (): Transformer<Root> => remarkMermaid(options);
}

export default remarkMermaid;

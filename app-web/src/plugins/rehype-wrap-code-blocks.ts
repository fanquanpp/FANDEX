import { visit } from 'unist-util-visit';
import type { Element, ElementContent, Parents, Properties, Root } from 'hast';
import type { ShikiTransformer } from 'shiki';

/**
 * 代码块 SSR 化（第 1 期规格 2.6 / 第 2 期 S3）。
 *
 * 之前代码框架由客户端 src/lib/layout-interactions.ts 的 initCopyButtons 在
 * 浏览器里动态包 .code-block：JS 失败即整体消失，2000+ 页每页浏览都跑一遍
 * DOM 扫描。现在前移到构建期：
 *
 * - 输出 figure.code-block[data-lang]，内含头栏 .code-block__head（常显：
 *   语言名右对齐；meta title 时左侧出标题）与 SSR copy 按钮——关 JS 时
 *   框架 / 语言名 / 按钮仍在 HTML 源码里；
 * - mermaid 块跳过（原 layout-interactions.ts:185 的判断前移）：dev 下
 *   pre[data-language=mermaid] 由客户端 mermaid-render 接管；生产构建下
 *   rehype-mermaid-dual 已把外层换成 figure.mermaid-figure，但其内部还
 *   保留一个 hidden 的 pre[data-language=mermaid] 源码块，同样不能包，
 *   否则出现双层框架；
 * - 交互（复制 / copied 反馈）改 document 级事件委托，见 layout-interactions.ts。
 *
 * 复制按钮图标与 aria 标签按 SSR 输出定型：i18n-strings.ts 的 code.copyAria
 * 两种语言均为 'Copy code'，故默认值即唯一值，仍留参数口（constraints §3：
 * 配置由 astro.config 顶层显式传参，仿 rehype-wrap-tables 模式）。
 */

export interface RehypeWrapCodeBlocksOptions {
  /** copy 按钮 aria-label（默认与 i18n-strings.ts code.copyAria 一致） */
  copyAriaLabel?: string;
}

/** 复制图标（与 layout-interactions.ts 委托反馈里的 check 图标同一套 14px 线稿） */
function clipboardIconElement(): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      width: '14',
      height: '14',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      ariaHidden: 'true',
    },
    children: [
      {
        type: 'element',
        tagName: 'rect',
        properties: { x: '9', y: '9', width: '13', height: '13', rx: '2' },
        children: [],
      },
      {
        type: 'element',
        tagName: 'path',
        properties: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
        children: [],
      },
    ],
  };
}

/** 从 pre 上取语言：优先 shiki 的 data-language，兜底 code 子元素的 language-* 类 */
function readLanguage(pre: Element): string {
  const dataLang = pre.properties.dataLanguage;
  if (typeof dataLang === 'string' && dataLang) return dataLang;
  const code = pre.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code',
  );
  if (!code) return '';
  const className = code.properties.className;
  const list = Array.isArray(className) ? className : typeof className === 'string' ? [className] : [];
  for (const value of list) {
    const name = String(value);
    if (name.startsWith('language-')) return name.slice('language-'.length);
  }
  return '';
}

function textSpan(tagName: 'span', className: string, value: string): Element {
  return {
    type: 'element',
    tagName,
    properties: { className: [className] },
    children: [{ type: 'text', value }],
  };
}

export function rehypeWrapCodeBlocks(options: RehypeWrapCodeBlocksOptions = {}) {
  const copyAriaLabel = options.copyAriaLabel ?? 'Copy code';
  return (tree: Root) => {
    visit(
      tree,
      'element',
      (node: Element, index: number | undefined, parent: Parents | undefined) => {
        if (node.tagName !== 'pre') return;
        if (index === undefined || parent === undefined) return;
        if (parent.type !== 'element' && parent.type !== 'root') return;

        // mermaid 跳过：dev 是未渲染的源码块，生产是 mermaid-figure 内的
        // hidden 源码块，包进 code-block 都会产生双层框架
        if (readLanguage(node) === 'mermaid') return;

        // 幂等：已在 figure.code-block 内（重复执行 / 手写 HTML）不二次包裹
        if (
          parent.type === 'element' &&
          parent.tagName === 'figure' &&
          Array.isArray(parent.properties.className) &&
          (parent.properties.className as Array<string>).includes('code-block')
        ) {
          return;
        }

        const lang = readLanguage(node);
        const title = node.properties.dataTitle;
        const headChildren: ElementContent[] = [];
        if (typeof title === 'string' && title) {
          headChildren.push(textSpan('span', 'code-block__title', title));
        }
        if (lang) {
          headChildren.push(textSpan('span', 'code-block__lang', lang));
        }
        headChildren.push({
          type: 'element',
          tagName: 'button',
          properties: {
            className: ['copy-btn', 'fndx-icon-btn'],
            type: 'button',
            ariaLabel: copyAriaLabel,
          } as Properties,
          children: [clipboardIconElement()],
        });

        const head: Element = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['code-block__head'] },
          children: headChildren,
        };

        const figure: Element = {
          type: 'element',
          tagName: 'figure',
          properties: {
            className: ['code-block'],
            ...(lang ? { dataLang: lang } : {}),
          },
          children: [head, node],
        };

        parent.children[index] = figure;
      },
    );
  };
}

/** meta 上 title="..." 的解析（三种引号形态） */
const RE_META_TITLE = /(?:^|\s)title=(?:"([^"]*)"|'([^']*)'|(\S+))/;
/** 行号开关（默认关，规格 2.6 第 4 条：仅 meta 单块开启） */
const RE_META_LINE_NUMBERS = /(?:^|\s)line-numbers(?=\s|$)/;

/**
 * 自定义 title / 行号 transformer（约 30 行，规格 2.6 第 2 条第 4 款）：
 * 读取代码围栏 meta，把 title 写进 pre 的 data-title（插件据此出头栏），
 * line-numbers 写进 pre 的 data-line-numbers（code.css 据此开行号）。
 * astro.config.ts 的 shikiConfig.transformers 与 design-system 标本共用本实现。
 */
export function transformerCodeBlockTitle(): ShikiTransformer {
  return {
    name: 'fandex:code-block-title',
    pre(node) {
      const raw = this.options.meta?.__raw;
      if (!raw) return;
      const titleMatch = raw.match(RE_META_TITLE);
      const title = titleMatch ? (titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]) : undefined;
      if (title) node.properties.dataTitle = title;
      if (RE_META_LINE_NUMBERS.test(raw)) node.properties.dataLineNumbers = '';
    },
  };
}

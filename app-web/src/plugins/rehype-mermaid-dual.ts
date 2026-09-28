import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MermaidConfig } from 'mermaid';
import { createMermaidRenderer, type MermaidRenderer } from 'mermaid-isomorphic';
import { chromium } from 'playwright';
import type { Element, ElementContent, Nodes } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';

/**
 * Mermaid 构建期渲染（双主题）。
 *
 * 之前 mermaid 由客户端脚本在浏览器里渲染：首次进入页面要先下载约 1MB 的
 * mermaid 再逐图绘制，长图只能横向滚动，无法缩放，体验"堪比 SVG 拼凑"。
 * 现在改为构建期用 mermaid-isomorphic（rehype-mermaid 同款渲染内核）在
 * headless Chromium 中把每张图渲染成最终 SVG，同时输出亮 / 暗两套配色，
 * 页面加载即所见，客户端只剩 panzoom 交互（见 lib/mermaid-interactions.ts）。
 *
 * 亮暗两套 SVG 同时内联，由 data-theme 的 CSS 规则切换显示——主题切换
 * 不再需要重新渲染任何图表。
 *
 * 失败兜底：
 * - 浏览器不可用（未安装 Playwright Chromium）时整体跳过，代码块保留，
 *   由客户端动态加载 mermaid 渲染（dev 模式即走此路径）；
 * - 单张图语法非法时仅该图回退为高亮源码块。
 */

const CACHE_VERSION = 'v1';
const CACHE_DIR = join(import.meta.dirname ?? '.', '..', '..', 'node_modules', '.cache', 'mermaid-dual');

const sharedConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  layout: 'dagre',
  look: 'classic',
  fontSize: 15,
  flowchart: { curve: 'basis', nodeSpacing: 24, rankSpacing: 40, useMaxWidth: true, padding: 12 },
  sequence: { diagramMarginX: 12, diagramMarginY: 12, boxMargin: 12, useMaxWidth: true },
};

const lightConfig: MermaidConfig = {
  ...sharedConfig,
  theme: 'neutral',
  themeVariables: {
    primaryColor: '#EEFCFB',
    primaryTextColor: '#10403C',
    primaryBorderColor: '#14716A',
    lineColor: '#26ABA2',
    secondaryColor: '#E6F5F2',
    tertiaryColor: '#F2FAF8',
    textColor: '#2A3538',
    mainBkg: '#EEFCFB',
    nodeBorder: '#14716A',
    clusterBkg: 'transparent',
    clusterBorder: '#BCC8D0',
    titleColor: '#141414',
    edgeLabelBackground: '#FFFFFF',
    noteBkgColor: '#E6F5F2',
    noteTextColor: '#10403C',
    noteBorderColor: '#14716A',
  },
};

const darkConfig: MermaidConfig = {
  ...sharedConfig,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#0E5560',
    primaryTextColor: '#EBEFF3',
    primaryBorderColor: '#39C5BB',
    lineColor: '#39C5BB',
    secondaryColor: '#0E3B38',
    tertiaryColor: '#10201D',
    textColor: '#CCD5DB',
    mainBkg: '#0E5560',
    nodeBorder: '#39C5BB',
    clusterBkg: 'transparent',
    clusterBorder: '#2A3538',
    titleColor: '#EBEFF3',
    edgeLabelBackground: '#141414',
    noteBkgColor: '#123B36',
    noteTextColor: '#EBEFF3',
    noteBorderColor: '#39C5BB',
  },
};

let renderer: MermaidRenderer | null = null;
let rendererBroken = false;

function getRenderer(): MermaidRenderer | null {
  if (rendererBroken) return null;
  if (!renderer) {
    try {
      renderer = createMermaidRenderer({ browserType: chromium });
    } catch (err) {
      rendererBroken = true;
      console.warn('[mermaid-dual] 无法启动渲染浏览器，构建期渲染已跳过（客户端兜底接管）:', err);
      return null;
    }
  }
  return renderer;
}

function readCache(key: string): string | null {
  try {
    return readFileSync(join(CACHE_DIR, `${key}.svg`), 'utf-8');
  } catch {
    return null;
  }
}

function writeCache(key: string, svg: string): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${key}.svg`), svg);
  } catch {
    /* 缓存写入失败不影响构建 */
  }
}

function cacheKey(source: string, theme: 'light' | 'dark'): string {
  const hash = createHash('sha256').update(CACHE_VERSION).update(theme).update(source).digest('hex');
  return `${theme}-${hash.slice(0, 32)}`;
}

async function renderTheme(
  sources: string[],
  theme: 'light' | 'dark',
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(sources.length).fill(null);
  const pending: number[] = [];
  sources.forEach((source, index) => {
    const cached = readCache(cacheKey(source, theme));
    if (cached) results[index] = cached;
    else pending.push(index);
  });
  if (pending.length === 0) return results;

  const instance = getRenderer();
  if (!instance) return results;

  const config = theme === 'light' ? lightConfig : darkConfig;
  try {
    const batchSources: string[] = [];
    for (const index of pending) {
      const source = sources[index];
      if (source !== undefined) batchSources.push(source);
    }
    const settled = await instance(batchSources, { mermaidConfig: config, prefix: `fandex-${theme}` });
    for (let slot = 0; slot < settled.length; slot += 1) {
      const result = settled[slot];
      const index = pending[slot];
      if (result === undefined || index === undefined) continue;
      if (result.status === 'fulfilled' && result.value.svg) {
        const withSize = ensureResponsiveSvg(result.value.svg);
        results[index] = withSize;
        const source = sources[index];
        if (source !== undefined) writeCache(cacheKey(source, theme), withSize);
      }
    }
  } catch (err) {
    // 浏览器不可用属于环境问题：全局停用构建期渲染（回退客户端），避免逐篇刷警告
    if (err instanceof Error && /launch|browser|Executable/i.test(err.message)) {
      rendererBroken = true;
      console.warn('[mermaid-dual] 渲染浏览器不可用，构建期渲染已停用（客户端兜底接管）:', err.message);
      return results;
    }
    console.warn(`[mermaid-dual] ${theme} 主题渲染失败，相关图表回退为源码块:`, err);
  }
  return results;
}

/** mermaid 输出的 svg 自带固定 width/height，这里改为由 CSS 控制的响应式尺寸 */
function ensureResponsiveSvg(svg: string): string {
  return svg.replace(
    /(<svg[^>]*?)\sstyle="([^"]*)"/i,
    (_match, head: string, style: string) =>
      `${head} style="${style.replace(/max-width:[^;"]*;?/i, '')}" data-mermaid-svg`,
  );
}

function collectText(node: Nodes): string {
  if (node.type === 'text') return node.value;
  if (!('children' in node)) return '';
  return node.children.map(collectText).join('');
}

function codeLanguage(node: Element): string {
  const classes = node.properties?.className;
  if (Array.isArray(classes)) {
    for (const value of classes) {
      const name = String(value);
      if (name.startsWith('language-')) return name.slice(9);
    }
    return '';
  }
  const raw = typeof classes === 'string' ? classes : '';
  return raw.replace(/^language-/, '');
}

function el(tagName: string, properties: Element['properties'], children: ElementContent[]): Element {
  return { type: 'element', tagName, properties, children };
}

/** 从 hast 树里收集 mermaid 代码块，返回每个块的源码与其 pre 节点 */
function collectMermaidPres(tree: Nodes): { pre: Element; source: string }[] {
  const found: { pre: Element; source: string }[] = [];
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'pre') return;
    // 兼容两种到达形态：Shiki 处理后的 pre[data-language] 与原始 pre>code.language-mermaid
    const preLang = node.properties?.dataLanguage;
    if (typeof preLang === 'string' && preLang === 'mermaid') {
      found.push({ pre: node, source: collectText(node).trim() });
      return;
    }
    const codeChild = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    );
    if (codeChild && codeLanguage(codeChild) === 'mermaid') {
      found.push({ pre: node, source: collectText(codeChild).trim() });
    }
  });
  return found;
}

export function rehypeMermaidDual() {
  return async (tree: Nodes) => {
    // 仅生产构建在构建期渲染；dev 保持客户端渲染（改图表即时反馈，且无需本地浏览器）
    if (process.env.NODE_ENV !== 'production' || process.env.FANDEX_MERMAID_CLIENT === '1') return;

    const blocks = collectMermaidPres(tree);
    if (blocks.length === 0) return;

    const sources = blocks.map((block) => block.source);
    const [lightSvgs, darkSvgs] = await Promise.all([
      renderTheme(sources, 'light'),
      renderTheme(sources, 'dark'),
    ]);

    blocks.forEach((block, index) => {
      const light = lightSvgs[index];
      const dark = darkSvgs[index];
      if (!light || !dark) return; // 渲染失败：保留原代码块（客户端或源码展示兜底）

      const figure = el('figure', { className: ['mermaid-figure'], dataMermaidFigure: '' }, [
        el('div', { className: ['mermaid-canvas'] }, [
          el('div', { className: ['mermaid-svg', 'is-light'] }, []),
          el('div', { className: ['mermaid-svg', 'is-dark'] }, []),
        ]),
        el('div', { className: ['mermaid-toolbar'], dataMermaidToolbar: '' }, []),
        el('pre', { className: ['mermaid-source'], dataLanguage: 'mermaid', hidden: true }, [
          el('code', { className: ['language-mermaid'] }, [{ type: 'text', value: block.source }]),
        ]),
        el('figcaption', { className: ['mermaid-caption'] }, [{ type: 'text', value: 'mermaid diagram' }]),
      ]);

      // 把 svg 标记解析为真实 hast 节点插入（避免 raw 节点被下游管线丢弃）
      const svgElement = (wrapper: Element, svg: string): void => {
        const parsed = fromHtml(svg, { fragment: true }).children.filter(
          (child): child is Element => child.type === 'element',
        );
        wrapper.children = parsed;
      };
      const canvas = figure.children[0];
      if (canvas && canvas.type === 'element') {
        const lightWrap = canvas.children[0];
        const darkWrap = canvas.children[1];
        if (lightWrap && lightWrap.type === 'element' && darkWrap && darkWrap.type === 'element') {
          svgElement(lightWrap, light);
          svgElement(darkWrap, dark);
        }
      }

      Object.assign(block.pre, figure);
    });
  };
}
